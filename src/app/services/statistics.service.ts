import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { throwError as observableThrowError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../environments/environment';

@Injectable()
export class StatisticsService {

  private GET_STATISTICS = environment.BASE_URL + 'statistics';
  private GET_STATISTICS_HISTORY = environment.BASE_URL + 'statistics/history';

  constructor(private http: HttpClient) { }

  /**
   *    GET  | /foglamp/statistics
   */
  public getStatistics() {
    return this.http.get(this.GET_STATISTICS).pipe(
      map(response => response),
      catchError((error: Response) => observableThrowError(error)));
  }

  /**
   *  GET | /foglamp/statistics/history
   */
  public getStatisticsHistory(limit, key = null) {
    let params = new HttpParams();
    params = params.append('limit', limit);
    if (key && key != null) {
      params = params.append('key', key);
    }
    return this.http.get(this.GET_STATISTICS_HISTORY, { params: params }).pipe(
      map(response => response),
      catchError((error: Response) => observableThrowError(error)));
  }
}
