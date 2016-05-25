import {IViewModel} from "durelia-viewmodel";
import {INoteRepository, NoteRepository, Note} from "services/noterepository";
import {transient, inject, Lazy, observe, useView} from "durelia-framework";
import {INoteViewModel, INoteViewModelActivationOptions, NoteViewModel} from "views/_shared/note";
import {IDialogService, DialogService} from "durelia-dialog";


interface INoteDetailActivationModel {
    id: number;
}

@useView("views/notes/notedetail.html")
@observe(true)
@transient
@inject(NoteRepository, NoteViewModel, DialogService)
export default class NoteDetail implements IViewModel<INoteDetailActivationModel> {
    constructor(
        private noteRepository: INoteRepository,
        public noteModel: INoteViewModel,
        private dialogService: IDialogService
    ) {}

    heading: string;
    hasUnsavedChanges: boolean = false;

    save(noteViewModel: INoteViewModel, skipGoBack?: boolean): Promise<any> {
        let promise = noteViewModel.note.id >= 0
            ? this.noteRepository.update(noteViewModel.note)
            : this.noteRepository.add(noteViewModel.note);

        return promise.then(() => {
            this.hasUnsavedChanges = false;
            return skipGoBack ? Promise.resolve() : this.back();
        });
    }

    remove(noteViewModel: INoteViewModel): Promise<boolean> {
        return this.dialogService.confirm("Are you sure you want to delete this note?", "Delete?")
            .then(confirmed => {
                if (confirmed) {
                    return this.noteRepository.deleteById(noteViewModel.note.id)
                        .then((result) => {
                            this.hasUnsavedChanges = false;
                            this.back();
                            return result;
                        });
                    
                } else {
                    return Promise.resolve(false);
                }
            });
    }

    add(): void {
        location.assign("#items/-1");
    }

    back(): void {
        window.history.back();
    }

    cancel(): Promise<any> {
        this.back();
        return Promise.resolve();
    }

    getNotePartialActivationOptions(note: Note): INoteViewModelActivationOptions {
        return {
            note: note,
            readonly: false,
            owner: this,
            handlers: {
                save: this.save,
                remove: this.remove,
                cancel: this.cancel
            }
        };
    }

    activate(model: INoteDetailActivationModel): Promise<any> {
        let note: Note;
        let notePromise: Promise<Note>;
        if (model.id < 0) {
            this.heading = "New note";
            this.hasUnsavedChanges = true;
            notePromise = Promise.resolve(this.noteRepository.createNew());
        } else {
            this.heading = "Edit note";
            notePromise = this.noteRepository.getById(model.id);
        }
        return notePromise.then((n: Note) => {
            //this.createSubscription(n.content, this.onNoteContentChange);
            return this.noteModel.activate(this.getNotePartialActivationOptions(n));
        });
    }
    
    canDeactivate(): Promise<boolean> {
        if (this.hasUnsavedChanges) {
            return this.dialogService.confirm("Do you want to save the note before leaving?", "Save changes")
                .then(confirmed => {
                    return confirmed 
                        ? this.save(this.noteModel, true).then(() => true)
                        : Promise.resolve(false);
                });
        } else {
            return Promise.resolve(true);
        }
    }
    
    private onNoteContentChange() {
        this.hasUnsavedChanges = true;
    }
    
}