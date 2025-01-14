import { forwardRef, Module, OnModuleInit } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { RolePermissionModule } from '@gauzy/core';
import { HelpCenterController } from './help-center.controller';
import { HelpCenter } from './help-center.entity';
import { HelpCenterService } from './help-center.service';
import { CommandHandlers } from './commands/handlers';

@Module({
	imports: [
		RouterModule.register([{ path: '/help-center', module: HelpCenterModule }]),
		forwardRef(() => TypeOrmModule.forFeature([HelpCenter])),
		forwardRef(() => MikroOrmModule.forFeature([HelpCenter])),
		RolePermissionModule,
		CqrsModule
	],
	providers: [HelpCenterService, ...CommandHandlers],
	controllers: [HelpCenterController],
	exports: [HelpCenterService]
})
export class HelpCenterModule implements OnModuleInit {
	constructor() { }

	onModuleInit() { }
}
