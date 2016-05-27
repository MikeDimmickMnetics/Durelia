import {IViewModel} from "durelia-viewmodel";
import {transient, inject, Lazy, observe, useView} from "durelia-framework";
import {INoteDetailActivationModel} from "views/notes/notedetail";
import {INoteRepository, NoteRepository, Note, ISortOrder} from "services/noterepository";
import {INoteViewModel, INoteViewModelActivationOptions, NoteViewModel} from "views/_shared/note";
import {IDialogService, DialogService} from "durelia-dialog";
import {INavigationController, NavigationController} from "durelia-router";

interface LabeledItem<T> {
    text: string;
    value: T;
}

export interface INoteListActivationModel {
    editMode?: "samepage" | "separatepage";
}

@observe(true)
@useView("views/notes/notelist.html")
@transient
@inject(NoteRepository, Lazy.of(NoteViewModel), DialogService, NavigationController)
export default class NoteList implements IViewModel<INoteListActivationModel> {
    constructor(
        private noteRepository: INoteRepository,
        private createNoteViewModel: () => INoteViewModel,
        private dialogService: IDialogService,
        private navigator: INavigationController
    ) {}
    
    private allowEditing: boolean = false;

    hasUnsavedChanges: boolean = false;

    noteModels: INoteViewModel[] = [];

    sortPropOptions: LabeledItem<string>[] = [
        { text: "date", value: "modified" }, 
        { text: "content", value: "content" }
    ];

    sortProp: LabeledItem<string> = this.sortPropOptions[0];

    sortDesc: boolean = false;
    
    toggleSortProp() {
        let curIdx = this.sortPropOptions.indexOf(this.sortProp);
        this.sortProp = (curIdx === this.sortPropOptions.length - 1)
            ? this.sortPropOptions[0]
            : this.sortPropOptions[curIdx + 1];
        this.sort();
    }
    
    get toggleEditModeButtonText() {
        return `Switch to ${this.allowEditing ? "separate-page" : "same-page"} edit-mode`;
    }
    
    toggleSortDirection() {
        this.sortDesc = !this.sortDesc;
        this.sort();
    }
    
    toggleEditMode() {
        this.navigator.navigateToRoute<INoteListActivationModel>("Notes", { editMode: this.allowEditing ? "separatepage" : "samepage" });
    }


    edit(noteViewModel: INoteViewModel): Promise<any> {
        this.navigator.navigateToRoute<INoteDetailActivationModel>("NoteDetail", { id: noteViewModel.note.id });
        return Promise.resolve();
    }
    
    remove(noteViewModel: INoteViewModel): Promise<boolean> {
        return this.dialogService.confirm("Are you sure you want to delete this note?", "Delete?")
            .then(confirmed => {
                if (confirmed) {
                    return this.noteRepository.deleteById(noteViewModel.note.id)
                        .then((result) => {
                            this.noteModels.splice(this.noteModels.indexOf(noteViewModel), 1);
                            return result;
                        });
                    
                } else {
                    return Promise.resolve(false);
                }
            });
    }
    
    add(): Promise<any> {
        if (this.allowEditing) {
            let note = this.noteRepository.createNew();
            let noteModel = this.createNoteViewModel();
            return noteModel.activate(this.getNotePartialActivationOptions(note)).then(() => {
                this.noteModels.push(noteModel);
                this.sort();
            });
        } else {
            this.navigator.navigateToRoute<INoteDetailActivationModel>("NoteDetail", { id: -1 });
            return Promise.resolve();
        }
    }
    
    save(noteViewModel: INoteViewModel): Promise<any> {
        let promise = noteViewModel.note.id >= 0
            ? this.noteRepository.update(noteViewModel.note)
            : this.noteRepository.add(noteViewModel.note);

        return promise.then(() => {
            this.hasUnsavedChanges = false;
            this.sort();
        });
    }
    
    private loadData(): Promise<any> {
        return this.getNoteModels()
            .then((noteModels) => {
                this.noteModels = noteModels;
            });
    }
    
    private getNoteModels(): Promise<INoteViewModel[]> {
        return this.noteRepository.get({ orderBy: { prop: this.sortProp.value, desc: this.sortDesc }})
            .then(notes => {
                let noteModels: INoteViewModel[] = [];
                return Promise.all(
                    notes.map(note => {
                        let notePartial = this.createNoteViewModel();
                        noteModels.push(notePartial); 
                        return notePartial.activate(this.getNotePartialActivationOptions(note));
                    })
                ).then(() => noteModels);
            });
    }
    
    private sort() {
        let prop = this.sortProp.value;
        let desc = this.sortDesc;
        
        let sortFn = (noteModelA: INoteViewModel, noteModelB: INoteViewModel) => {
            let noteA: Note = noteModelA.note;
            let noteB: Note = noteModelB.note;
            let valA: any = noteA[prop];
            let valB: any = noteB[prop];
            if (valA instanceof Date && valB instanceof Date) {
                valA = valA.getTime();
                valB = valB.getTime();
            }
            return valA < valB 
                ? (desc ? 1 : -1) 
                : (desc ? -1 : 1);
        };
        this.noteModels.sort(sortFn);
    }
    
    
    private getNotePartialActivationOptions(note: Note) {
        return {
            note: note,
            readonly: !this.allowEditing,
            owner: this,
            handlers: {
                edit: this.allowEditing ? undefined : this.edit,
                remove: this.remove,
                save: this.allowEditing ? this.save : undefined
            }
        };
    }
   
    activate(model: INoteListActivationModel): Promise<any> {
        this.allowEditing = model && model.editMode === "samepage";
        return this.loadData();
    }
    
    deactivate(): Promise<any> {
        return Promise.all(this.noteModels.map(n => n.deactivate()));
    }
}
