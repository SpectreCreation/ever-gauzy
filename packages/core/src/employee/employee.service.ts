import {
	IBasePerTenantAndOrganizationEntityModel,
	IDateRangePicker,
	IEmployee,
	IPagination,
	PermissionsEnum
} from '@gauzy/contracts';
import { BadRequestException, Injectable } from '@nestjs/common';
import { isNotEmpty } from '@gauzy/common';
import * as moment from 'moment';
import { Brackets, SelectQueryBuilder, UpdateResult, WhereExpressionBuilder } from 'typeorm';
import { RequestContext } from '../core/context';
import { PaginationParams, TenantAwareCrudService } from './../core/crud';
import { getDateRangeFormat } from './../core/utils';
import { Employee } from './employee.entity';
import { prepareSQLQuery as p } from './../database/database.helper';
import { MikroOrmEmployeeRepository, TypeOrmEmployeeRepository } from './repository';

@Injectable()
export class EmployeeService extends TenantAwareCrudService<Employee> {
	constructor(
		readonly typeOrmEmployeeRepository: TypeOrmEmployeeRepository,

		readonly mikroOrmEmployeeRepository: MikroOrmEmployeeRepository
	) {
		super(typeOrmEmployeeRepository, mikroOrmEmployeeRepository);
	}

	/**
	 * Retrieves all active employees with their associated user and organization details.
	 * @returns A Promise that resolves to an array of active employees.
	 */
	public async findAllActive(): Promise<Employee[]> {
		try {
			return await super.find({
				where: {
					isActive: true,
					isArchived: false,
				},
				relations: {
					user: true,
					organization: true
				},
			});
		} catch (error) {
			// Handle any potential errors, log, and optionally rethrow or return a default value.
			console.error('Error occurred while fetching active employees:', error);
			return [];
		}
	}


	/**
	 * Find the employees working in the organization for a particular date range.
	 * An employee is considered to be 'working' if:
	 * 1. The startedWorkOn date is (not null and) less than the last day forMonth
	 * 2. The endWork date is either null or greater than the first day forMonth
	 * @param organizationId
	 * @param forRange
	 * @param withUser
	 * @returns
	 */
	async findWorkingEmployees(
		organizationId: string,
		forRange: IDateRangePicker | any,
		withUser: boolean
	): Promise<IPagination<IEmployee>> {
		const query = this.repository.createQueryBuilder(this.alias);
		query.innerJoin(`${query.alias}.user`, 'user');
		query.innerJoin(`user.organizations`, 'organizations');
		query.setFindOptions({
			/**
			 * Load selected table properties/fields for self & relational select.
			 */
			select: {
				id: true,
				isActive: true,
				short_description: true,
				description: true,
				averageIncome: true,
				averageExpenses: true,
				averageBonus: true,
				startedWorkOn: true,
				isTrackingEnabled: true,
				billRateCurrency: true,
				billRateValue: true,
				minimumBillingRate: true,
				user: {
					id: true,
					firstName: true,
					lastName: true,
					email: true,
					imageUrl: true
				}
			},
			relations: {
				...(withUser ? { user: true } : {})
			}
		});
		query.where((qb: SelectQueryBuilder<Employee>) => {
			const tenantId = RequestContext.currentTenantId();
			qb.andWhere(
				new Brackets((web: WhereExpressionBuilder) => {
					web.andWhere(p(`"${qb.alias}"."tenantId" = :tenantId`), { tenantId });
					web.andWhere(p(`"${qb.alias}"."organizationId" = :organizationId`), { organizationId });
					web.andWhere(p(`"${qb.alias}"."isActive" = :isActive`), { isActive: true });
					web.andWhere(p(`"user"."isArchived" = :isArchived`), { isArchived: false });
				})
			);
			if (isNotEmpty(forRange)) {
				if (forRange.startDate && forRange.endDate) {
					const { start: startDate, end: endDate } = getDateRangeFormat(
						moment.utc(forRange.startDate),
						moment.utc(forRange.endDate)
					);
					qb.andWhere(
						new Brackets((web: WhereExpressionBuilder) => {
							web.andWhere(p(`"${qb.alias}"."startedWorkOn" <= :startedWorkOn`), {
								startedWorkOn: endDate
							});
						})
					);
					qb.andWhere(
						new Brackets((web: WhereExpressionBuilder) => {
							web.where(p(`"${qb.alias}"."endWork" IS NULL`));
							web.orWhere(p(`"${qb.alias}"."endWork" >= :endWork`), {
								endWork: startDate
							});
						})
					);
				}
			}
			if (!RequestContext.hasPermission(PermissionsEnum.CHANGE_SELECTED_EMPLOYEE)) {
				const employeeId = RequestContext.currentEmployeeId();
				qb.andWhere(p(`"${qb.alias}"."id" = :employeeId`), { employeeId });
			}
		});
		const [items, total] = await query.getManyAndCount();
		return { items, total };
	}

	/**
	 * Find the counts of employees working in the organization for a particular date range.
	 * An employee is considered to be 'working' if:
	 * 1. The startedWorkOn date is (not null and) less than the last day forMonth
	 * 2. The endWork date is either null or greater than the first day forMonth
	 * @param organizationId
	 * @param forRange
	 * @param withUser
	 * @returns
	 */
	async findWorkingEmployeesCount(
		organizationId: string,
		forRange: IDateRangePicker | any,
		withUser: boolean
	): Promise<{ total: number }> {
		const { total } = await this.findWorkingEmployees(organizationId, forRange, withUser);
		return {
			total
		};
	}

	/**
	 * Get all employees using pagination
	 *
	 * @param options Pagination options
	 * @returns Promise containing paginated employees and total count
	 */
	public async pagination(options: PaginationParams<any>): Promise<IPagination<IEmployee>> {
		try {
			// Retrieve the current tenant ID from the RequestContext
			const tenantId = RequestContext.currentTenantId();

			// Create a query builder for the Employee entity
			const query = this.repository.createQueryBuilder(this.alias);

			// Tables joins with relations
			query.innerJoin(`${query.alias}.user`, 'user');
			query.innerJoin(`user.organizations`, 'organizations');
			query.leftJoin(`${query.alias}.tags`, 'tags');

			// Set pagination options and selected table properties/fields
			query.setFindOptions({
				skip: options && options.skip ? options.take * (options.skip - 1) : 0,
				take: options && options.take ? options.take : 10,
				select: {
					// Selected fields for the Employee entity
					id: true,
					short_description: true,
					description: true,
					averageIncome: true,
					averageExpenses: true,
					averageBonus: true,
					startedWorkOn: true,
					endWork: true,
					isTrackingEnabled: true,
					deletedAt: true,
					allowScreenshotCapture: true,
					isActive: true,
					isArchived: true
				},
				...(options && options.relations ? { relations: options.relations } : {}),
				...(options && 'withDeleted' in options ? { withDeleted: options.withDeleted } : {})
			});

			// Build WHERE clause using QueryBuilder
			query.where((qb: SelectQueryBuilder<Employee>) => {
				const { where } = options;
				// Apply conditions related to the current tenant and organization ID
				qb.andWhere(
					new Brackets((web: WhereExpressionBuilder) => {
						web.andWhere(p(`"${qb.alias}"."tenantId" = :tenantId`), { tenantId });

						if (isNotEmpty(where?.organizationId)) {
							const organizationId = where.organizationId;
							web.andWhere(p(`"${qb.alias}"."organizationId" = :organizationId`), { organizationId });
							web.andWhere(p(`"organizations"."organizationId" = :organizationId`), { organizationId });
						}
					})
				);
				// Additional conditions based on the provided 'where' object
				if (isNotEmpty(where)) {
					// Apply conditions for specific fields in the Employee entity
					qb.andWhere(
						new Brackets((web: WhereExpressionBuilder) => {
							const fields = ['isActive', 'isArchived', 'isTrackingEnabled', 'allowScreenshotCapture'];
							fields.forEach((key: string) => {
								if (key in where) {
									web.andWhere(p(`${qb.alias}.${key} = :${key}`), { [key]: where[key] });
								}
							});
						})
					);

					// Apply conditions related to tags
					qb.andWhere(
						new Brackets((web: WhereExpressionBuilder) => {
							if (isNotEmpty(where.tags)) {
								web.andWhere(p('tags.id IN (:...tags)'), { tags: where.tags });
							}
						})
					);

					// Apply conditions related to the user property in the 'where' object
					qb.andWhere(
						new Brackets((web: WhereExpressionBuilder) => {
							const { user } = where;
							if (isNotEmpty(user)) {
								if (isNotEmpty(user.name)) {
									const keywords: string[] = user.name.split(' ');
									keywords.forEach((keyword: string, index: number) => {
										web.orWhere(p(`LOWER("user"."firstName") like LOWER(:first_name_${index})`), {
											[`first_name_${index}`]: `%${keyword}%`
										});
										web.orWhere(p(`LOWER("user"."lastName") like LOWER(:last_name_${index})`), {
											[`last_name_${index}`]: `%${keyword}%`
										});
									});
								}
								if (isNotEmpty(user.email)) {
									const keywords: string[] = user.email.split(' ');
									keywords.forEach((keyword: string, index: number) => {
										web.orWhere(p(`LOWER("user"."email") like LOWER(:email_${index})`), {
											[`email_${index}`]: `%${keyword}%`
										});
									});
								}
							}
						})
					);
				}
			});

			// Execute the query and retrieve paginated items and total count
			const [items, total] = await query.getManyAndCount();
			return { items, total };
		} catch (error) {
			throw new BadRequestException(error);
		}
	}

	/**
	 * Soft Delete employee
	 *
	 * @param employeeId
	 * @returns
	 */
	async softDelete(
		employeeId: IEmployee['id'],
		options: IBasePerTenantAndOrganizationEntityModel
	): Promise<UpdateResult> {
		try {
			const { organizationId } = options;
			await this.findOneByIdString(employeeId, {
				where: {
					organizationId
				}
			});
			return await this.repository.softDelete({
				id: employeeId,
				organizationId,
				tenantId: RequestContext.currentTenantId()
			});
		} catch (error) {
			throw new BadRequestException(error);
		}
	}

	/**
	 * Alternatively, You can recover the soft deleted rows by using the restore() method:
	 */
	async restoreSoftDelete(
		employeeId: IEmployee['id'],
		options: IBasePerTenantAndOrganizationEntityModel
	): Promise<UpdateResult> {
		try {
			const { organizationId } = options;
			return await this.repository.restore({
				id: employeeId,
				organizationId,
				tenantId: RequestContext.currentTenantId()
			});
		} catch (error) {
			throw new BadRequestException(error);
		}
	}
}
