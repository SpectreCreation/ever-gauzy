import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { RouterModule } from '@nestjs/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Role } from './role.entity';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { RolePermissionModule } from './../role-permission/role-permission.module';
import { CommandHandlers } from './commands/handlers';

@Module({
	imports: [
		RouterModule.register([
			{ path: '/roles', module: RoleModule }
		]),
		forwardRef(() => TypeOrmModule.forFeature([Role])),
		forwardRef(() => MikroOrmModule.forFeature([Role])),
		forwardRef(() => RolePermissionModule),
		CqrsModule
	],
	controllers: [RoleController],
	providers: [RoleService, ...CommandHandlers],
	exports: [
		TypeOrmModule,
		MikroOrmModule,
		RoleService
	]
})
export class RoleModule { }
