import { Component } from '@angular/core';
import { AnonymousSubscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Rx';

import { MomentDatePipe } from '../../../../pipes/moment-date';

import { AssetsService, PingService } from '../../../../services';
import { AssetSummaryService } from './../asset-summary/asset-summary-service';

import ReadingsValidator from '../assets/readings-validator';
import { MAX_INT_SIZE, POLLING_INTERVAL, COLOR_CODES } from '../../../../utils';


@Component({
  selector: 'app-readings-graph',
  templateUrl: './readings-graph.component.html',
  styleUrls: ['./readings-graph.component.css']
})
export class ReadingsGraphComponent {
  public assetCode: string;
  public assetChartType: string;
  public assetReadingValues: any;
  public showGraph = true;
  public assetReadingSummary = [];
  public isInvalidLimit = false;
  public MAX_RANGE = MAX_INT_SIZE;
  public DEFAULT_LIMIT = 10;
  public graphRefreshInterval = POLLING_INTERVAL;
  private graphTimerSubscription: AnonymousSubscription;
  public limit: number;
  public readKeyColorLabel = [];

  constructor(private assetService: AssetsService,
    private assetSummaryService: AssetSummaryService,
    private ping: PingService) {
    this.assetChartType = 'line';
    this.assetReadingValues = [];
  }

  public roundTo(num, to) {
    const _to = Math.pow(10, to);
    return Math.round(num * _to) / _to;
  }

  public toggleModal(shouldOpen: Boolean) {
    const chart_modal = <HTMLDivElement>document.getElementById('chart_modal');
    if (shouldOpen) {
      this.ping.pingIntervalChanged.subscribe((timeInterval: number) => {
        this.graphRefreshInterval = timeInterval;
      });
      chart_modal.classList.add('is-active');
      return;
    }
    if (this.graphTimerSubscription) {
      this.graphTimerSubscription.unsubscribe();
      this.graphTimerSubscription = null;
    }
    chart_modal.classList.remove('is-active');
  }

  public plotReadingsGraph(assetCode, limit: any) {
    if (this.assetCode === '') {
      return false;
    }
    if (this.graphTimerSubscription) {
      this.graphTimerSubscription.unsubscribe();
      this.graphTimerSubscription = null;
    }

    this.isInvalidLimit = false;
    if (limit === undefined || limit === null || limit === '' || limit === 0) {
      limit = this.DEFAULT_LIMIT;
    } else if (!Number.isInteger(+limit) || +limit < 0 || +limit > this.MAX_RANGE) { // max limit of int in c++
      this.isInvalidLimit = true;
      return;
    }

    this.limit = limit;
    this.assetCode = assetCode;

    this.assetService.getAssetReadings(encodeURIComponent(assetCode), +limit).
      subscribe(
        (data: any[]) => {
          this.showGraph = true;
          if (data.length === 0) {
            this.getAssetTimeReading(data);
            return;
          }
          const validRecord = ReadingsValidator.validate(data);
          if (validRecord) {
            this.assetSummaryService.getReadingSummary(
              {
                assetCode: assetCode,
                readings: data[0],
              });
            this.assetSummaryService.assetReadingSummary.subscribe(
              value => {
                this.assetReadingSummary = value;
                console.log('this.assetReadingSummary', this.assetReadingSummary);
              });
            this.getAssetTimeReading(data);
          } else {
            this.showGraph = false;
          }
          if (this.graphRefreshInterval > 0) {
            this.enableRefreshTimer();
          }
        },
        error => {
          console.log('error in response', error);
        });
  }

  public getAssetTimeReading(assetChartRecord) {
    let assetTimeLabels = [];
    const datePipe = new MomentDatePipe();

    let assetReading = [];
    if (assetChartRecord.length === 0) {
      assetTimeLabels = [];
      assetReading = [];
    } else {
      assetChartRecord.reverse().forEach(data => {
        Object.keys(data.reading).forEach(key => {
          if (assetReading.length < Object.keys(data.reading).length) {
            const read = {
              key: key,
              values: [data.reading[key]],
            };
            assetReading.push(read);
          } else {
            assetReading.map(el => {
              if (el.key === key) {
                el.values.push(data.reading[key]);
              }
            });
          }
        });
        assetTimeLabels.push(datePipe.transform(data.timestamp, 'HH:mm:ss'));
      });
    }
    this.statsAssetReadingsGraph(assetTimeLabels, assetReading);
  }

  getColorCode(readKey, cnt, fill) {
    let cc = '';
    if (!['RED', 'GREEN', 'BLUE'].includes(readKey.toUpperCase())) {
      cc = COLOR_CODES[cnt];
    }
    if (readKey.toUpperCase() === 'RED') {
      cc = '#FF334C';
    } else if (readKey.toUpperCase() === 'BLUE') {
      cc = '#339FFF';
    } else if (readKey.toUpperCase() === 'GREEN') {
      cc = '#008000';
    }

    if (fill) {
      const o = {
        readKey: cc
      };
      this.readKeyColorLabel.push({ [readKey] : cc });
    }
    console.log(this.readKeyColorLabel);
    return cc;
  }

  private statsAssetReadingsGraph(labels, assetReading): void {
    this.readKeyColorLabel = [];
    const ds = [];
    let count = 0;
    assetReading.forEach(element => {
      const dt = {
        label: element.key,
        data: element.values,
        fill: false,
        lineTension: 0.1,
        spanGaps: true,
        backgroundColor: this.getColorCode(element.key.trim(), count, true),
        borderColor: this.getColorCode(element.key, count, false)
      };
      count++;
      ds.push(dt);
    });
    this.assetChartType = 'line';
    this.setAssetReadingValues(labels, ds);
  }

  private setAssetReadingValues(labels, ds) {
    this.assetReadingValues = {
      labels: labels,
      datasets: ds
    };
  }

  public clearField(limitField) {
    limitField.inputValue = '';
  }

  private enableRefreshTimer(): void {
    this.graphTimerSubscription = Observable.timer(this.graphRefreshInterval)
      .subscribe(() => this.plotReadingsGraph(this.assetCode, this.limit));
  }
}
