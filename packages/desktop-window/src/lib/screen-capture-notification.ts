import { screen } from 'electron';
import { IBaseWindow } from './interfaces';
import { BaseWindow } from './interfaces/base-window';
import { LocalStore } from '@gauzy/desktop-libs';
import { DefaultWindow, WindowConfig } from './concretes';

export class ScreenCaptureNotification
	extends BaseWindow
	implements IBaseWindow {
	private static readonly WIDTH: number = 310;
	private static readonly HEIGHT: number = 170;

	constructor(path?: string) {
		super(
			new DefaultWindow(
				new WindowConfig('/screen-capture', path, {
					frame: false,
					resizable: false,
					roundedCorners: true,
					width: ScreenCaptureNotification.WIDTH,
					height: ScreenCaptureNotification.HEIGHT,
					alwaysOnTop: true,
					center: false,
					focusable: false,
					skipTaskbar: true,
					x:
						screen.getPrimaryDisplay().size.width -
						(ScreenCaptureNotification.WIDTH + 16),
					y: 16,
				})
			)
		);

		this.browserWindow.setVisibleOnAllWorkspaces(true, {
			visibleOnFullScreen: true,
			skipTransformProcessType: false,
		});
		this.browserWindow.setAlwaysOnTop(true);
		this.browserWindow.setFullScreenable(false);
	}

	public show(thumbUrl?: string): void {
		if (!this.browserWindow) return;
		this.browserWindow.showInactive();
		this.browserWindow.webContents.send('show_popup_screen_capture', {
			note: LocalStore.beforeRequestParams().note,
			...(thumbUrl && { imgUrl: thumbUrl }),
		});
	}

	public hide(): void {
		setTimeout(() => {
			super.hide();
		}, 3000);
	}
}
