import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { NgProgress } from 'ngx-progressbar';

import { AlertService, ConfigurationService, ServicesHealthService, SchedulesService } from '../../../../services';
import { Router } from '../../../../../../node_modules/@angular/router';

@Component({
  selector: 'app-add-service-wizard',
  templateUrl: './add-service-wizard.component.html',
  styleUrls: ['./add-service-wizard.component.css']
})
export class AddServiceWizardComponent implements OnInit {

  public plugins = [];
  public configurationData = [];
  public serviceId;
  public isServiceEnabled = false;
  public isValidPlugin = false;
  public isValidName = true;

  serviceForm = new FormGroup({
    name: new FormControl(),
    type: new FormControl(),
    plugin: new FormControl()
  });

  constructor(private formBuilder: FormBuilder,
    private servicesHealthService: ServicesHealthService,
    private alertService: AlertService,
    private configService: ConfigurationService,
    private schedulesService: SchedulesService,
    private router: Router,
    private ngProgress: NgProgress) { }

  ngOnInit() {
    this.serviceForm = this.formBuilder.group({
      name: ['', Validators.required],
      type: ['', Validators.required],
      plugin: ['', Validators.required]
    });
    this.serviceForm.get('type').setValue('south');
    this.serviceForm.get('plugin').setValue('select');
  }

  movePrevious() {
    const last = <HTMLElement>document.getElementsByClassName('is-active')[0];
    const id = last.getAttribute('id');
    console.log('previous', id);
    last.classList.remove('is-active');
    const sId = +id - 1;
    const previous = <HTMLElement>document.getElementById('' + sId);
    previous.setAttribute('class', 'step-item is-active');

    const stepContent = <HTMLElement>document.getElementById('c-' + id);
    if (stepContent != null) {
      stepContent.classList.remove('is-active');
    }

    const nextContent = <HTMLElement>document.getElementById('c-' + sId);
    if (nextContent != null) {
      nextContent.setAttribute('class', 'step-content has-text-centered is-active');
    }

    const nxtButton = <HTMLButtonElement>document.getElementById('next');
    const previousButton = <HTMLButtonElement>document.getElementById('previous');

    switch (+id) {
      case 2:
        this.serviceForm.get('plugin').setValue('select');
        previousButton.disabled = true;
        break;
      case 4:
        nxtButton.textContent = 'Enable & Start Service';
        nxtButton.disabled = false;
        break;
      default:
        this.serviceForm.get('name').setValue('');
        this.serviceForm.get('type').setValue('south');
        nxtButton.textContent = 'Next';
        nxtButton.disabled = false;
        break;
    }
  }

  moveNext() {
    this.isValidPlugin = true;
    this.isValidName = true;
    const formValues = this.serviceForm.value;
    const first = <HTMLElement>document.getElementsByClassName('is-active')[0];
    const id = first.getAttribute('id');

    // if (this.serviceForm.controls.name.value.trim().length === 0 && +id === 1) {
    //   this.isValidName = false;
    //   return;
    // }

    // if (this.serviceForm.controls.plugin.value === 'select' && +id === 2) {
    //   this.isValidPlugin = false;
    //   return;
    // }

    const nxtButton = <HTMLButtonElement>document.getElementById('next');
    const previousButton = <HTMLButtonElement>document.getElementById('previous');

    switch (+id) {
      case 1:
        if (this.serviceForm.controls.name.value.trim().length === 0) {
          this.isValidName = false;
          return;
        }
        previousButton.disabled = false;
        if (formValues['name'] !== '' && formValues['type'] !== '') {
          this.servicesHealthService.getPlugins(formValues['type']).subscribe(
            (data: any) => {
              this.plugins = data.plugins;
            },
            (error) => {
              if (error.status === 0) {
                console.log('service down ', error);
              } else {
                this.alertService.error(error.statusText);
              }
            });
        }
        break;
      case 2:
        if (this.serviceForm.controls.plugin.value === 'select') {
          this.isValidPlugin = false;
          return;
        }
        nxtButton.textContent = 'Enable & Start Service';
        if (formValues['name'] !== '' && formValues['plugin'].length > 0 && formValues['plugin'] !== 'select') {
          this.addService(formValues);
        }
        break;
      case 3:
        nxtButton.textContent = 'Done';
        if (this.serviceId.length > 0) {
          this.schedulesService.enableSchedule(this.serviceId).
            subscribe(
              (data) => {
                /** request completed */
                this.ngProgress.done();
                this.alertService.success(data['message']);
              },
              error => {
                /** request completed */
                this.ngProgress.done();
                if (error.status === 0) {
                  console.log('service down ', error);
                } else {
                  this.alertService.error(error.statusText);
                }
              });
        }
        break;
      case 4:
        this.router.navigate(['/services-health']);
        break;
      default:
        break;
    }

    first.classList.remove('is-active');
    first.classList.add('is-completed');

    const sId = +id + 1;
    const next = <HTMLElement>document.getElementById('' + sId);
    if (next != null) {
      next.setAttribute('class', 'step-item is-active');
    }

    const stepContent = <HTMLElement>document.getElementById('c-' + id);
    if (stepContent != null) {
      stepContent.classList.remove('is-active');
    }

    const nextContent = <HTMLElement>document.getElementById('c-' + sId);
    if (nextContent != null) {
      nextContent.setAttribute('class', 'step-content has-text-centered is-active');
    }
  }

  addService(formValues) {
    this.servicesHealthService.addService(formValues)
      .subscribe(
        (data) => {
          this.alertService.success('Service added successfully.');
          this.getCategory(data['name']);
          this.serviceId = data['id'];
          this.isServiceEnabled = true;
        },
        (error) => {
          this.isServiceEnabled = false;
          if (error.status === 0) {
            console.log('service down ', error);
          } else {
            this.alertService.error(error.statusText);
          }
        });
  }

  private getCategory(categoryName: string): void {
    this.configurationData = [];
    this.configService.getCategory(categoryName).
      subscribe(
        (data: any) => {
          this.configurationData.push(data);
        },
        error => {
          if (error.status === 0) {
            console.log('service down ', error);
          } else {
            this.alertService.error(error.statusText);
          }
        });
  }

  public onTextChange(configItemKey: string) {
    const cancelButton = <HTMLButtonElement>document.getElementById('btn-cancel-' + configItemKey.toLowerCase());
    cancelButton.classList.remove('hidden');
  }

  public restoreConfigFieldValue(configItemKey: string) {
    const inputField = <HTMLInputElement>document.getElementById(configItemKey.toLowerCase());
    inputField.value = inputField.textContent;
    const cancelButton = <HTMLButtonElement>document.getElementById('btn-cancel-' + configItemKey.toLowerCase());
    cancelButton.classList.add('hidden');
  }

  public saveConfigValue(configItem: string, type: string) {
    const catItemId = (configItem.trim()).toLowerCase();
    const inputField = <HTMLInputElement>document.getElementById(catItemId);
    const value = inputField.value.trim();
    const id = inputField.id.trim();
    const cancelButton = <HTMLButtonElement>document.getElementById('btn-cancel-' + id);
    cancelButton.classList.add('hidden');
    const categoryName = this.serviceForm.value['name'];
    /** request started */
    this.ngProgress.start();
    this.configService.saveConfigItem(categoryName, configItem, value, type).
      subscribe(
        (data) => {
          /** request completed */
          this.ngProgress.done();
          if (data['value'] !== undefined) {
            if (type.toUpperCase() === 'JSON') {
              inputField.textContent = inputField.value = JSON.stringify(data['value']);
            } else {
              inputField.textContent = inputField.value = data['value'];
            }
            this.alertService.success('Value updated successfully');
          }
        },
        error => {
          /** request completed */
          this.ngProgress.done();
          if (error.status === 0) {
            console.log('service down ', error);
          } else {
            this.alertService.error(error.statusText);
          }
        });
  }

  validatePluginValue(event) {
    if (event.target.value !== 'select') {
      this.isValidPlugin = true;
    }
  }

  validateServiceName(event) {
    console.log(event.target.value);
    if (event.target.value.trim().length > 0) {
      this.isValidName = true;
    }
  }
}
