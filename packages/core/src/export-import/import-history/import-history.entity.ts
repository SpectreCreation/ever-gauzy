import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column } from 'typeorm';
import { IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { Exclude } from 'class-transformer';
import { IImportHistory, ImportStatusEnum } from '@gauzy/contracts';
import { TenantBaseEntity } from '../../core/entities/internal';
import { MultiORMEntity } from '../../core/decorators/entity';
import { MikroOrmImportHistoryRepository } from './repository/mikro-orm-import-history.repository';

@MultiORMEntity('import-history', { mikroOrmRepository: () => MikroOrmImportHistoryRepository })
export class ImportHistory extends TenantBaseEntity implements IImportHistory {

	@ApiProperty({ type: () => String })
	@IsNotEmpty()
	@Column()
	file: string;

	@Exclude({ toPlainOnly: true })
	@ApiProperty({ type: () => String })
	@IsNotEmpty()
	@Column()
	path: string;

	@ApiPropertyOptional({ type: () => Number })
	@IsOptional()
	@IsNumber()
	@Column({ nullable: true })
	size: number;

	@ApiProperty({ type: () => String, enum: ImportStatusEnum })
	@IsNotEmpty()
	@IsEnum(ImportStatusEnum)
	@Column()
	status: ImportStatusEnum;

	@ApiPropertyOptional({ type: () => Date })
	@IsOptional()
	@IsDate()
	@Column({ default: () => 'CURRENT_TIMESTAMP' })
	importDate?: Date;

	public fullUrl?: string;
}
