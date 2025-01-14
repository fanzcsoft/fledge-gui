import { Component, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { orderBy } from 'lodash';
import { AlertService, ProgressBarService, RolesService, SharedService } from '../../../../../services';
import { ControlDispatcherService } from '../../../../../services/control-dispatcher.service';
import { ConfirmationDialogComponent } from '../../../../common/confirmation-dialog/confirmation-dialog.component';
import { DialogService } from '../../../../common/confirmation-dialog/dialog.service';

@Component({
  selector: 'app-control-scripts-list',
  templateUrl: './control-scripts-list.component.html',
  styleUrls: ['./control-scripts-list.component.css']
})
export class ControlScriptsListComponent implements OnInit {
  controlScripts: any = [];
  @ViewChild('confirmationDialog') confirmationDialog: ConfirmationDialogComponent;
  script;
  private subscription: Subscription;
  constructor(
    private controlService: ControlDispatcherService,
    private alertService: AlertService,
    private dialogService: DialogService,
    private sharedService: SharedService,
    private ngProgress: ProgressBarService,
    public rolesService: RolesService) {
    this.subscription = this.controlService.triggerRefreshEvent.subscribe(tab => {
      if (tab === 'scripts') {
        this.getControlScripts();
      }
    })
  }

  ngOnInit(): void {
    this.getControlScripts();
  }

  getControlScripts() {
    /** request started */
    this.ngProgress.start();
    this.controlService.fetchControlServiceScripts()
      .subscribe((data: any) => {
        this.ngProgress.done();
        this.controlScripts = orderBy(data.scripts, 'name');
      }, error => {
        /** request completed */
        this.ngProgress.done();
        if (error.status === 0) {
          console.log('service down ', error);
        } else {
          this.alertService.error(error.statusText);
        }
      });
  }

  setScript(script: any) {
    this.script = script.name;
  }

  openModal(id: string) {
    this.dialogService.open(id);
  }

  closeModal(id: string) {
    this.dialogService.close(id);
  }

  deleteScript(script) {
    /** request started */
    this.ngProgress.start();
    this.controlService.deleteScript(script)
      .subscribe((data: any) => {
        this.ngProgress.done();
        this.alertService.success(data.message);
        // close modal
        this.closeModal('confirmation-dialog');
        this.getControlScripts();
      }, error => {
        /** request completed */
        this.ngProgress.done();
        // close modal
        this.closeModal('confirmation-dialog');
        if (error.status === 0) {
          console.log('service down ', error);
        } else {
          this.alertService.error(error.statusText);
        }
      });
  }

  public ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
