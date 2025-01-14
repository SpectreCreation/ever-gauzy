import { environment as env } from '@gauzy/config';
import { CanActivate, ExecutionContext, Injectable, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verify } from 'jsonwebtoken';
import { PermissionsEnum, RolesEnum } from '@gauzy/contracts';
import { isEmpty, PERMISSIONS_METADATA, removeDuplicates } from '@gauzy/common';
import * as camelCase from 'camelcase';
import { RequestContext } from './../../core/context';
import { Brackets, WhereExpressionBuilder } from 'typeorm';
import { TypeOrmEmployeeRepository } from '../../employee/repository/type-orm-employee.repository';

@Injectable()
export class OrganizationPermissionGuard implements CanActivate {

	constructor(
		readonly _reflector: Reflector,
		readonly _typeOrmEmployeeRepository: TypeOrmEmployeeRepository
	) { }

	/**
	 * Checks if the user is authorized based on specified permissions.
	 * @param context The execution context.
	 * @returns A promise that resolves to a boolean indicating authorization status.
	 */
	async canActivate(context: ExecutionContext): Promise<boolean> {
		// Retrieve permissions from metadata
		const targets: Array<Function | Type<any>> = [context.getHandler(), context.getClass()];
		const permissions = removeDuplicates(this._reflector.getAllAndOverride<PermissionsEnum[]>(PERMISSIONS_METADATA, targets)) || [];

		// If no specific permissions are required, consider it authorized
		if (isEmpty(permissions)) {
			return true;
		}

		let isAuthorized: boolean = false;

		// Check user authorization
		const token = RequestContext.currentToken();

		const { id, role, employeeId } = verify(token, env.JWT_SECRET) as {
			id: string;
			role: string;
			employeeId: string;
		};

		// Check if super admin role is allowed from the .env file
		if (env.allowSuperAdminRole && RequestContext.hasRoles([RolesEnum.SUPER_ADMIN])) {
			return true;
		}

		// Check permissions based on user role
		if (role === RolesEnum.EMPLOYEE) {
			console.log(`Guard: Organization Permissions for Employee ID: ${employeeId}`);
			// Check if user has the required permissions
			isAuthorized = await this.checkOrganizationPermission(employeeId, permissions);
		} else {
			// For non-employee roles, consider it authorized
			isAuthorized = true;
		}

		if (!isAuthorized) {
			// Log unauthorized access attempts
			console.log(`Unauthorized access blocked: User ID: ${id}, Role: ${role}, Employee ID: ${employeeId}, Permissions Checked: ${permissions.join(', ')}`);
		}

		return isAuthorized;
	}

	/**
	 * Checks if the employee has at least one specified permission in the associated organization.
	 * @param employeeId - The ID of the employee to check permissions for.
	 * @param permissions - An array of permission strings to check.
	 * @returns A Promise that resolves to a boolean indicating if at least one permission is allowed in the organization.
	 */
	async checkOrganizationPermission(employeeId: string, permissions: string[]): Promise<boolean> {
		try {
			console.time('Organization Permission Guard Time');
			const tenantId = RequestContext.currentTenantId();
			// Create a query builder for the 'employee' entity
			const query = this._typeOrmEmployeeRepository.createQueryBuilder('employee');
			// Inner join with the 'organization' entity
			query.innerJoin('employee.organization', 'organization');
			// Add a condition for the employee ID
			query.where('employee.id = :employeeId', { employeeId });
			// Add a condition for the tenant ID
			query.andWhere('employee.tenantId = :tenantId', { tenantId });
			// Use OR condition for each permission
			query.andWhere(
				new Brackets((qb: WhereExpressionBuilder) => {
					permissions.forEach((permission) => {
						qb.orWhere(`organization.${camelCase(permission)} = true`);
					});
				})
			);
			// Execute the query and get the count
			const count = await query.getCount();
			console.timeEnd('Organization Permission Guard Time');
			// Returns true if at least one permission is allowed in the organization, false otherwise
			return count > 0;
		} catch (error) {
			// Handle any potential errors, log, and optionally rethrow or return a default value.
			console.error('Error occurred while checking organization permission:', error);
			return false;
		}
	}
}
