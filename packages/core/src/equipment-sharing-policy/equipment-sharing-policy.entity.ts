/*
 *  Approval Policy is predefined approval types for the organization.
 * E.g. for example, "Business Trip", "Borrow Items", ...
 * Approval Policy table has the many to one relationship to the Organization table and Tenant by organizationId and tenantId
 */
import { Index, Column, OneToMany } from 'typeorm';
import { IEquipmentSharing, IEquipmentSharingPolicy } from '@gauzy/contracts';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { EquipmentSharing, TenantOrganizationBaseEntity } from '../core/entities/internal';
import { MultiORMEntity } from './../core/decorators/entity';
import { MikroOrmEquipmentSharingPolicyRepository } from './repository/mikro-orm-equipment-sharing-policy.repository';

@MultiORMEntity('equipment_sharing_policy', { mikroOrmRepository: () => MikroOrmEquipmentSharingPolicyRepository })
export class EquipmentSharingPolicy extends TenantOrganizationBaseEntity implements IEquipmentSharingPolicy {

	@ApiProperty({ type: () => String })
	@IsString()
	@IsNotEmpty()
	@Index()
	@Column()
	name: string;

	@ApiProperty({ type: () => String })
	@IsString()
	@Column({ nullable: true })
	description: string;

	/*
	|--------------------------------------------------------------------------
	| @OneToMany
	|--------------------------------------------------------------------------
	*/

	/**
	* EquipmentSharing
	*/
	@ApiProperty({ type: () => EquipmentSharing, isArray: true })
	@OneToMany(() => EquipmentSharing, (it) => it.equipmentSharingPolicy, {
		onDelete: 'CASCADE'
	})
	equipmentSharings?: IEquipmentSharing[];
}
