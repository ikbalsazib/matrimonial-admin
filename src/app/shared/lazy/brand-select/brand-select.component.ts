import { AfterViewInit, Component, Input, OnChanges, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatSelectSearchComponent } from 'ngx-mat-select-search';
import { EMPTY, ReplaySubject, Subject, filter, takeUntil, tap } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Brand } from '../../../interfaces/common/brand.interface';
import { Pagination } from '../../../interfaces/core/pagination';
import { FilterData } from '../../../interfaces/gallery/filter-data';
import { BrandService } from '../../../services/common/brand.service';
import { UtilsService } from '../../../services/core/utils.service';

@Component({
  selector: 'app-brand-select',
  templateUrl: './brand-select.component.html',
  styleUrls: ['./brand-select.component.scss']
})
export class BrandSelectComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {

  // Dynamic Component Data
  @Input('controlName') controlName: FormControl;
  @Input('required') required: boolean = false;
  @Input('placeholder') placeholder: string = 'Select';
  @Input('data') data: Brand;

  // Store Data
  public dataList: Brand[] = [];
  public filteredDataList: ReplaySubject<Brand[]> = new ReplaySubject<Brand[]>(1);
  searchDataList: Brand[] = [];

  // Form Control
  public selectCtrl: FormControl;

  // Search Control
  public searchCtrl: FormControl = new FormControl();

  // Search Progress
  public searching = false;

  // Pagination
  currentPage = 1;
  dataPerPage = 10;
  totalData = 0;

  // Destroy
  protected _onDestroy = new Subject<void>();

  @ViewChild('matSearchSelect') matSearchSelect: MatSelectSearchComponent;

  constructor(
    private brandService: BrandService,
    private utilsService: UtilsService,
  ) { }

  ngOnInit(): void {
    if (this.controlName) {
      this.selectCtrl = this.controlName;
    } else {
      this.selectCtrl = new FormControl();
    }
    // Default Data
    this.getAllBrandList();
  }



  ngOnChanges() {
    if (this.data) {
      this.dataList.push(this.data);
      this.selectCtrl.setValue(this.data);
    }
  }


  /**
   * MAIN SEARCH
   */
  ngAfterViewInit() {
    this.searchCtrl.valueChanges
      .pipe(
        filter(search => !!search),
        tap(() => this.searching = true),
        takeUntil(this._onDestroy),
        debounceTime(400),
        distinctUntilChanged(),
        switchMap(search => {
          if (!this.searchCtrl.value.trim()) {
            this.searching = false;
            if (this.selectCtrl.value) {
              const singleArray = [this.selectCtrl.value];
              const allBrands = [...this.searchDataList, ...this.dataList]
              const selectedData = allBrands.filter(m => {
                return singleArray.some(n => n === m._id)
              });
              const uniqueData = this.utilsService.margeMultipleArrayUnique('_id', selectedData, selectedData);
              this.filteredDataList.next([...uniqueData, ...this.dataList]);
              return EMPTY;
            } else {
              this.filteredDataList.next([...this.dataList]);
              return EMPTY;
            }

          }

          const pagination: Pagination = {
            pageSize: 10,
            currentPage: 0,
          };

          // Select
          const mSelect = {
            name: 1,
            slug: 1,
          };

          const filterData: FilterData = {
            pagination: pagination,
            filter: null,
            select: mSelect,
            sort: { createdAt: -1 },
          };

          return this.brandService.getAllBrands(filterData, search);
        })
      )
      .subscribe({
        next: res => {
          this.searching = false;
          this.searchDataList = [...this.searchDataList, ...res.data];
          this.filteredDataList.next(res.data);
        },
        error: error => {
          this.searching = false;
          console.log(error)
        }

      })
  }

  /**
   * GET NEXT DATA
   */
  getNextTestBatch() {
    if (this.searchCtrl.value) {
      return;
    }
    this.currentPage += 1;
    this.getAllBrandList();
  }

  /**
   * HTTP REQ HANDLE
   * getAllBrandList()
   */

  private getAllBrandList() {

    // Select
    const mSelect = {
      name: 1,
      nameBn: 1,
      nameIt: 1,
      slug: 1,
    };


    const pagination: Pagination = {
      pageSize: this.dataPerPage,
      currentPage: this.currentPage - 1
    };

    const filter: FilterData = {
      filter: null,
      pagination: pagination,
      select: mSelect,
      sort: { createdAt: -1 },
    };



    this.brandService.getAllBrands(filter, null)
      .subscribe({
        next: res => {
          this.totalData = res.count;
          if (this.selectCtrl.value) {
            const singleArray = [this.selectCtrl.value];
            const allBrands = [...this.searchDataList, ...this.dataList]
            const selectedData = allBrands.filter(m => {
              return singleArray.some(n => n === m._id)
            });
            const uniqueData = this.utilsService.margeMultipleArrayUnique('_id', selectedData, selectedData);
            this.dataList = [...this.dataList, ...res.data];
            this.filteredDataList.next([...uniqueData, ...this.dataList, ...res.data]);
          } else {
            this.dataList = [...this.dataList, ...res.data];
            this.filteredDataList.next(this.dataList);
          }
        },
        error: error => {
          console.log(error);
        }
      })
  }

  /**
   * ON CLEAR SEARCH
   * ON CLOSE PANEL
   */
  onClear() {
    this.searchCtrl.reset();
    this.getDefaultDataArray();
  }

  /**
   * DEFAULT COMPLEX DATA FOR SELECT TRACK
   */
  private getDefaultDataArray() {
    if (this.selectCtrl.value) {
      const singleArray = [this.selectCtrl.value];
      const allBrands = [...this.searchDataList, ...this.dataList]
      const selectedData = allBrands.filter(m => {
        return singleArray.some(n => n._id === m._id)
      });
      const uniqueData = this.utilsService.margeMultipleArrayUnique('_id', selectedData, selectedData);
      this.filteredDataList.next([...uniqueData, ...this.dataList]);
      this.selectCtrl.patchValue(uniqueData[0]);
    } else {
      this.filteredDataList.next([...this.dataList]);
    }
  }

  /**
   * ON DESTROY
   */
  ngOnDestroy() {
    this._onDestroy.next();
    this._onDestroy.complete();
  }


}
