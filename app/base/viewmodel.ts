import * as ko from "knockout";
import * as durandalObservable from "plugins/observable";
import {IDialogController} from "app-dialog";
import {computedRegistryKeyName} from "framework/viewmodeldecorators";

export interface IViewModel<TActivationOptions> {
    canActivate?(): Promise<boolean>;
    activate(options?: TActivationOptions): Promise<any>;
    canDeactivate?(): Promise<boolean>;
    deactivate(): Promise<any>;
}

export interface IModalViewModel<TActivationOptions, TDialogResult> extends IViewModel<TActivationOptions> {
}

export abstract class BaseViewModel<TActivationOptions> implements IViewModel<TActivationOptions> {
    
    constructor() {
        /* tslint:disable:forin */
        if (this[computedRegistryKeyName]) {
            for (let computedProp in this[computedRegistryKeyName]) {
                let computedDef: KnockoutComputedDefine<any> = this[computedRegistryKeyName][computedProp];
                computedDef.owner = this;
                durandalObservable.defineProperty<any>(this, computedProp, computedDef);
            }
            delete this[computedRegistryKeyName];
        }
        /* tslint:enable:forin */
    }
    
    canActivate(): Promise<boolean> {
        return Promise.resolve(true);
    }

    abstract activate(options: TActivationOptions): Promise<any>;
    
    canDeactivate(): Promise<boolean> {
        return Promise.resolve(true);
    }

    deactivate(): Promise<any> {
        this._disposables.forEach(d => d.dispose());
        return Promise.resolve();
    }
    
    private binding() {
        return { applyBindings: true, skipConversion: true };
    }
    
    private _disposables: IDisposable[] = [];
    
}

export abstract class BaseModalViewModel<TActivationOptions, TDialogResult> 
    extends BaseViewModel<TActivationOptions> 
    implements IModalViewModel<TActivationOptions, TDialogResult> {

    constructor(
        private dialogController: IDialogController<TDialogResult>
    ) {
        super();
    }
    
    protected ok(result: TDialogResult): void {
        this.dialogController.ok(result, this);
    }

    protected cancel(result: TDialogResult): void {
        this.dialogController.ok(result, this);
    }

}