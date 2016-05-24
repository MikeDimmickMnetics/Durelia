import {IViewModel, BaseViewModel, observe} from "base/viewmodel";
import {ITermsPartial, TermsPartial} from "views/home/home.terms";
import {useView, transient, inject} from "dependency-injection";

@observe
@useView("views/home/home.html")
@transient
@inject(TermsPartial)
export default class Home extends BaseViewModel<void> {
        
    constructor(
        public termsPartial: ITermsPartial
    ) {
        super();
    }
    
    heading: string;
    
    activate(): Promise<any> {
        this.heading = "Home";
        return this.termsPartial.activate();
    }

    deactivate(): Promise<any> {
        return this.termsPartial.deactivate().then(() => super.deactivate());
    }
}
