import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { isNotEmpty } from '@gauzy/common';
import { IIntegrationSetting, IntegrationEnum } from '@gauzy/contracts';
import { arrayToObject } from 'core/utils';
import { IntegrationTenantService } from 'integration-tenant/integration-tenant.service';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class GithubMiddleware implements NestMiddleware {
	constructor(
		@Inject(CACHE_MANAGER) private cacheManager: Cache,
		private readonly _integrationTenantService: IntegrationTenantService
	) {}

	async use(request: Request, _response: Response, next: NextFunction) {
		try {
			const integrationId = request.params['integrationId'];

			if (integrationId) {
				const queryParameters = request.query;

				const tenantId = queryParameters.tenantId
					? queryParameters.tenantId.toString()
					: request.header('Tenant-Id');

				const organizationId = queryParameters.organizationId
					? queryParameters.organizationId.toString()
					: request.header('Organization-Id');

				// Check if tenant and organization IDs are not empty
				if (isNotEmpty(tenantId) && isNotEmpty(organizationId)) {
					try {
						// Fetch integration settings from the service

						console.log(
							`Getting Gauzy integration settings from Cache for tenantId: ${tenantId}, organizationId: ${organizationId}, integrationId: ${integrationId}`
						);

						let integrationTenantSettings: IIntegrationSetting[] = await this.cacheManager.get(
							`integrationTenantSettings_${tenantId}_${organizationId}_${integrationId}`
						);

						if (!integrationTenantSettings) {
							console.log(
								`Gauzy integration settings NOT loaded from Cache for tenantId: ${tenantId}, organizationId: ${organizationId}, integrationId: ${integrationId}`
							);

							const fromDb = await this._integrationTenantService.findOneByIdString(integrationId, {
								where: {
									tenantId,
									organizationId,
									isActive: true,
									isArchived: false,
									integration: {
										isActive: true,
										isArchived: false
									}
								},
								relations: {
									settings: true
								}
							});

							if (fromDb && fromDb.settings) {
								integrationTenantSettings = fromDb.settings;

								await this.cacheManager.set(
									`integrationTenantSettings_${tenantId}_${organizationId}_${integrationId}`,
									integrationTenantSettings,
									60 * 1000 // 60 seconds caching period for Tenants Settings
								);

								console.log(
									`Gauzy integration settings loaded from DB and stored in Cache for tenantId: ${tenantId}, organizationId: ${organizationId}, integrationId: ${integrationId}`
								);
							}
						} else {
							console.log(
								`Gauzy integration settings loaded from Cache for tenantId: ${tenantId}, organizationId: ${organizationId}, integrationId: ${integrationId}`
							);
						}

						if (integrationTenantSettings && integrationTenantSettings.length > 0) {
							/** Create an 'integration' object and assign properties to it. */
							request['integration'] = new Object({
								// Assign properties to the integration object
								id: integrationId,
								name: IntegrationEnum.GITHUB,
								// Convert the 'settings' array to an object using the 'settingsName' and 'settingsValue' properties
								settings: arrayToObject(integrationTenantSettings, 'settingsName', 'settingsValue')
							});
						}
					} catch (error) {
						console.log(
							`Error while getting integration (${IntegrationEnum.GITHUB}) tenant inside middleware: %s`,
							error?.message
						);
						console.log(request.path, request.url);
					}
				}
			}
		} catch (error) {
			console.log(
				`Error while getting integration (${IntegrationEnum.GITHUB}) tenant inside middleware: %s`,
				error?.message
			);
			console.log(request.path, request.url);
		}

		// Continue to the next middleware or route handler
		next();
	}
}
