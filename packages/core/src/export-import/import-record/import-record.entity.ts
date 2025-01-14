import { ApiProperty } from '@nestjs/swagger';
import { Column } from 'typeorm';
import { IsDate } from 'class-validator';
import { IImportRecord } from '@gauzy/contracts';
import { MultiORMEntity } from './../../core/decorators/entity';
import { TenantBaseEntity } from '../../core/entities/internal';
import { MikroOrmImportRecordRepository } from './repository/mikro-orm-import-record.repository';

@MultiORMEntity('import-record', { mikroOrmRepository: () => MikroOrmImportRecordRepository })
export class ImportRecord extends TenantBaseEntity implements IImportRecord {

	@ApiProperty({ type: () => String })
	@Column({ nullable: false })
	entityType: string;

	@ApiProperty({ type: () => String })
	@Column({ nullable: false, type: 'uuid' })
	sourceId: string;

	@ApiProperty({ type: () => String })
	@Column({ nullable: false, type: 'uuid' })
	destinationId: string;

	@ApiProperty({ type: () => Date })
	@IsDate()
	@Column({ nullable: false, default: () => 'CURRENT_TIMESTAMP' })
	importDate?: Date;

	wasCreated?: boolean;
}
