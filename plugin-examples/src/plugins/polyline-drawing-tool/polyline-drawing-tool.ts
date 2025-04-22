import { CanvasRenderingTarget2D } from 'fancy-canvas';
import {
    IChartApi,
    ISeriesApi,
    ISeriesPrimitive,
    IPrimitivePaneRenderer,
    IPrimitivePaneView,
    MouseEventParams,
    SeriesAttachedParameter,
    SeriesType,
    Time,
} from 'lightweight-charts';

interface PolylinePoint {
    time: Time;
    price: number;
}

interface PolylineOptions {
    color: string;
    lineWidth: number;
    lineStyle: 'solid' | 'dashed';
    dashPattern?: number[];
    pointRadius: number;
    pointColor: string;
}

const defaultOptions: PolylineOptions = {
    color: '#2962FF',
    lineWidth: 2,
    lineStyle: 'solid',
    pointRadius: 4,
    pointColor: '#2962FF'
};

class PolylineRenderer implements IPrimitivePaneRenderer {
    _data: {
        points: ViewPoint[];
        options: PolylineOptions;
        tempPoint: ViewPoint | null;
    };

    constructor(data: {
        points: ViewPoint[];
        options: PolylineOptions;
        tempPoint: ViewPoint | null;
    }) {
        this._data = data;
    }

    draw(target: CanvasRenderingTarget2D): void {
        const { points, options, tempPoint } = this._data;
        console.log('[PolylineRenderer.draw] called');
        console.log('  points:', points);
        console.log('  points length:', points.length);
        console.log('  points stringified:', JSON.stringify(points));
        console.log('  tempPoint:', tempPoint);
        console.log('  options:', options);
        
        target.useBitmapCoordinateSpace(({ context: ctx, horizontalPixelRatio, verticalPixelRatio }) => {
            console.log('  [draw] horizontalPixelRatio:', horizontalPixelRatio, 'verticalPixelRatio:', verticalPixelRatio);
            
            // Clear any previous drawing state
            ctx.save();
            
            // When we have no points yet but a temp point for preview,
            // we just show a point at the cursor location
            if (points.length === 0 && tempPoint && tempPoint.x !== null && tempPoint.y !== null) {
                ctx.fillStyle = options.pointColor;
                const x = tempPoint.x as number;
                const y = tempPoint.y as number;
                console.log('    Drawing preview point at:', x, y);
                ctx.beginPath();
                ctx.arc(
                    Math.round(x * horizontalPixelRatio),
                    Math.round(y * verticalPixelRatio),
                    options.pointRadius * horizontalPixelRatio,
                    0,
                    2 * Math.PI
                );
                ctx.fill();
                ctx.restore();
                return;
            }
            
            // Skip drawing if we have no points
            if (points.length === 0) {
                console.log('    No points to draw.');
                ctx.restore();
                return;
            }
            
            console.log('    Drawing', points.length, 'points');
            
            // Set line style
            ctx.strokeStyle = options.color;
            ctx.lineWidth = options.lineWidth * horizontalPixelRatio;
            console.log('    Set strokeStyle:', options.color, 'lineWidth:', ctx.lineWidth);
            
            if (options.lineStyle === 'dashed') {
                if (options.dashPattern) {
                    ctx.setLineDash(options.dashPattern.map(p => p * horizontalPixelRatio));
                    console.log('    Set custom dash pattern:', options.dashPattern.map(p => p * horizontalPixelRatio));
                } else {
                    ctx.setLineDash([5 * horizontalPixelRatio, 5 * horizontalPixelRatio]);
                    console.log('    Set default dash pattern:', [5 * horizontalPixelRatio, 5 * horizontalPixelRatio]);
                }
            }
            
            // Begin path for the polyline
            ctx.beginPath();
            
            // Only draw if we have points
            if (points.length > 0) {
                console.log('    Drawing polyline path');
                
                // Move to first point
                const firstPoint = points[0];
                if (firstPoint && firstPoint.x !== null && firstPoint.y !== null) {
                    const x = firstPoint.x as number;
                    const y = firstPoint.y as number;
                    console.log(`    Move to first point: (${x}, ${y})`);
                    ctx.moveTo(
                        Math.round(x * horizontalPixelRatio), 
                        Math.round(y * verticalPixelRatio)
                    );
                    
                    // Draw lines to each subsequent point
                    for (let i = 1; i < points.length; i++) {
                        const point = points[i];
                        if (point && point.x !== null && point.y !== null) {
                            const x = point.x as number;
                            const y = point.y as number;
                            console.log(`    Line to point ${i}: (${x}, ${y})`);
                            ctx.lineTo(
                                Math.round(x * horizontalPixelRatio), 
                                Math.round(y * verticalPixelRatio)
                            );
                        }
                    }
                    
                    // If we have a temporary point (for mouse move), add that too
                    if (tempPoint && tempPoint.x !== null && tempPoint.y !== null) {
                        const x = tempPoint.x as number;
                        const y = tempPoint.y as number;
                        console.log(`    Line to temp point: (${x}, ${y})`);
                        ctx.lineTo(
                            Math.round(x * horizontalPixelRatio), 
                            Math.round(y * verticalPixelRatio)
                        );
                    }
                    
                    console.log('    Stroking path');
                    // Stroke the path
                    ctx.stroke();
                    
                    // Draw points
                    console.log('    Drawing point markers');
                    ctx.fillStyle = options.pointColor;
                    for (const point of points) {
                        if (point && point.x !== null && point.y !== null) {
                            const x = point.x as number;
                            const y = point.y as number;
                            ctx.beginPath();
                            ctx.arc(
                                Math.round(x * horizontalPixelRatio), 
                                Math.round(y * verticalPixelRatio), 
                                options.pointRadius * horizontalPixelRatio, 
                                0, 
                                2 * Math.PI
                            );
                            ctx.fill();
                        }
                    }
                } else {
                    console.log('    First point invalid, cannot draw polyline');
                }
            } else {
                console.log('    No valid points to draw');
            }
            
            ctx.restore();
        });
    }
}

interface ViewPoint {
    x: number | null;
    y: number | null;
}

class PolylinePaneView implements IPrimitivePaneView {
    _source: PolylineDrawingTool;
    _viewPoints: ViewPoint[] = [];
    _tempViewPoint: ViewPoint | null = null;

    constructor(source: PolylineDrawingTool) {
        this._source = source;
    }

    update(): void {
        console.log('🔄 PolylinePaneView.update called');
        const series = this._source.series;
        const chart = this._source.chart;
        
        console.log(`  Chart available: ${!!chart}, Series available: ${!!series}`);
        
        if (!series || !chart) {
            console.log('⚠️ Cannot update view points: missing chart or series');
            return;
        }
        
        console.log(`  Source points count: ${this._source._points.length}`);
        console.log(`  Source points data:`, JSON.stringify(this._source._points));
        
        // Debug the current viewPoints before update
        console.log(`  Current viewPoints before update: ${this._viewPoints.length}`, this._viewPoints);
        
        try {
            // Convert data points to view points - create a fresh array
            this._viewPoints = [];
            
            // Process each source point and add its view point to the array
            this._source._points.forEach((point, idx) => {
                const y = series.priceToCoordinate(point.price);
                const timeScale = chart.timeScale();
                const x = timeScale.timeToCoordinate(point.time);
                console.log(`  Point ${idx}: time=${point.time}, price=${point.price} -> x=${x}, y=${y}`);
                
                // Only add valid coordinates
                if (x !== null && y !== null) {
                    this._viewPoints.push({ x, y });
                } else {
                    console.log(`  ⚠️ Skipping point ${idx} with invalid coordinates`);
                }
            });
            
            console.log(`  View points after conversion: ${this._viewPoints.length}`, JSON.stringify(this._viewPoints));
        } catch (err) {
            console.error('Error converting points:', err);
        }
        
        // Update temp point if exists
        if (this._source._tempPoint) {
            const tempPoint = this._source._tempPoint;
            try {
                const y = series.priceToCoordinate(tempPoint.price);
                const timeScale = chart.timeScale();
                const x = timeScale.timeToCoordinate(tempPoint.time);
                this._tempViewPoint = (x !== null && y !== null) ? { x, y } : null;
                console.log(`  Temp point: time=${tempPoint.time}, price=${tempPoint.price} -> x=${x}, y=${y}`);
            } catch (err) {
                console.error('Error converting temp point:', err);
                this._tempViewPoint = null;
            }
        } else {
            this._tempViewPoint = null;
            console.log('  No temp point to update');
        }
    }

    renderer(): IPrimitivePaneRenderer {
        console.log('🎨 Creating renderer with', this._viewPoints.length, 'points');
        console.log('  ViewPoints data:', JSON.stringify(this._viewPoints));
        
        const renderer = new PolylineRenderer({
            points: this._viewPoints,
            options: this._source._options,
            tempPoint: this._tempViewPoint,
        });
        
        console.log('  Created renderer:', !!renderer);
        return renderer;
    }
}

export class PolylineDrawingTool implements ISeriesPrimitive<Time> {
    _chart: IChartApi | null = null;
    _series: ISeriesApi<SeriesType> | null = null;
    _points: PolylinePoint[] = [];
    _options: PolylineOptions;
    _paneViews: PolylinePaneView[];
    _active: boolean = false;
    _clickHandler: ((param: MouseEventParams) => void) | null = null;
    _moveHandler: ((param: MouseEventParams) => void) | null = null;
    _tempPoint: PolylinePoint | null = null;
    _requestUpdate: (() => void) | null = null;
    _toolbarContainer: HTMLDivElement | null = null;
    _toolbarButton: HTMLDivElement | null = null;

    constructor(options: Partial<PolylineOptions> = {}) {
        this._options = { ...defaultOptions, ...options };
        this._paneViews = [new PolylinePaneView(this)];
    }

    /**
     * Set up the drawing toolbar
     */
    setupToolbar(container: HTMLElement): void {
        // Create toolbar container if it doesn't exist
        if (!this._toolbarContainer) {
            this._toolbarContainer = document.createElement('div');
            this._toolbarContainer.style.position = 'absolute';
            this._toolbarContainer.style.top = '10px';
            this._toolbarContainer.style.right = '10px';
            this._toolbarContainer.style.display = 'flex';
            this._toolbarContainer.style.gap = '5px';
            this._toolbarContainer.style.zIndex = '100';
            container.appendChild(this._toolbarContainer);
        }

        // Create the draw button
        this._createToolbarButton();
    }

    /**
     * Create the drawing button in the toolbar
     */
    private _createToolbarButton(): void {
        if (!this._toolbarContainer) return;

        // Create draw button
        const button = document.createElement('div');
        button.style.width = '32px';
        button.style.height = '32px';
        button.style.borderRadius = '4px';
        button.style.backgroundColor = 'rgba(255, 255, 255, 0.85)';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.style.cursor = 'pointer';
        button.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.12)';
        button.title = 'Draw Polyline';
        
        // Add icon to button
        button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 7 9 4 15 7 21 4"></polyline>
            <polyline points="3 17 9 14 15 17 21 14"></polyline>
        </svg>`;
        
        // Toggle drawing mode on click
        button.addEventListener('click', () => {
            if (this._active) {
                this.deactivate();
                button.style.backgroundColor = 'rgba(255, 255, 255, 0.85)';
                button.style.color = '#333';
            } else {
                if (this._chart && this._series) {
                    this.activate(this._chart, this._series);
                    button.style.backgroundColor = 'rgba(41, 98, 255, 0.85)';
                    button.style.color = 'white';
                }
            }
        });
        
        this._toolbarContainer.appendChild(button);
        this._toolbarButton = button;
        
        // Create color picker
        const colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.value = this._options.color;
        colorPicker.style.width = '32px';
        colorPicker.style.height = '32px';
        colorPicker.style.padding = '0';
        colorPicker.style.border = 'none';
        colorPicker.style.borderRadius = '4px';
        colorPicker.style.backgroundColor = 'rgba(255, 255, 255, 0.85)';
        colorPicker.style.cursor = 'pointer';
        colorPicker.title = 'Change Line Color';
        
        colorPicker.addEventListener('change', () => {
            this.applyOptions({
                color: colorPicker.value,
                pointColor: colorPicker.value
            });
        });
        
        this._toolbarContainer.appendChild(colorPicker);
        
        // Create clear button
        const clearButton = document.createElement('div');
        clearButton.style.width = '32px';
        clearButton.style.height = '32px';
        clearButton.style.borderRadius = '4px';
        clearButton.style.backgroundColor = 'rgba(255, 255, 255, 0.85)';
        clearButton.style.display = 'flex';
        clearButton.style.alignItems = 'center';
        clearButton.style.justifyContent = 'center';
        clearButton.style.cursor = 'pointer';
        clearButton.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.12)';
        clearButton.title = 'Clear All Points';
        
        clearButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </svg>`;
        
        clearButton.addEventListener('click', () => {
            this.clearPoints();
        });
        
        this._toolbarContainer.appendChild(clearButton);
    }

    /**
     * Activate the polyline drawing tool
     */
    activate(chart: IChartApi, series: ISeriesApi<SeriesType>): void {
        console.log('🔍 Activating polyline drawing tool');
        if (this._active) {
            console.log('⚠️ Drawing tool already active, ignoring activate call');
            return;
        }
        
        this._chart = chart;
        this._series = series;
        this._active = true;
        console.log('✅ Polyline drawing mode activated');
        
        // Update button state
        if (this._toolbarButton) {
            this._toolbarButton.style.backgroundColor = 'rgba(41, 98, 255, 0.85)';
            this._toolbarButton.style.color = 'white';
            console.log('🎨 Updated toolbar button appearance');
        }
        
        // Setup click handler
        this._clickHandler = (param: MouseEventParams) => {
            console.log('👆 Click event received', param);
            
            if (!this._active) {
                console.log('⚠️ Click ignored: drawing mode not active');
                return;
            }
            
            if (!param.point) {
                console.log('⚠️ Click ignored: no point data');
                return;
            }
            
            if (!param.time) {
                console.log('⚠️ Click ignored: no time data');
                return;
            }
            
            if (!this._series) {
                console.log('⚠️ Click ignored: no series attached');
                return;
            }
            
            // Convert the coordinates
            const price = this._series.coordinateToPrice(param.point.y);
            if (price === null) {
                console.log('⚠️ Click ignored: could not convert y-coordinate to price');
                return;
            }
            
            // Add the point
            console.log('➕ Adding point at time:', param.time, 'price:', price);
            this._addPoint({
                time: param.time,
                price: price
            });
        };
        
        // Setup move handler for dynamic preview
        this._moveHandler = (param: MouseEventParams) => {
            if (!this._active || !param.point || !param.time || !this._series) {
                this._tempPoint = null;
                this._updateView();
                return;
            }
            
            const price = this._series.coordinateToPrice(param.point.y);
            if (price === null) {
                this._tempPoint = null;
                this._updateView();
                return;
            }
            
            this._tempPoint = {
                time: param.time,
                price: price
            };
            
            this._updateView();
        };

        // Subscribe to events
        console.log('Subscribing click handler:', !!this._clickHandler);
        this._chart.subscribeClick(this._clickHandler);
        console.log('Subscribing move handler:', !!this._moveHandler);
        this._chart.subscribeCrosshairMove(this._moveHandler);
        
        // Add a direct DOM click handler for debugging
        const chartElement = this._chart.chartElement();
        console.log('Chart element exists:', !!chartElement);
        if (chartElement) {
            chartElement.addEventListener('click', (e: MouseEvent) => {
                console.log('🔵 DOM click event on chart element', e);
                console.log('Active status:', this._active);
                console.log('Current points:', this._points.length);
            });
        }
    }

    /**
     * Deactivate the polyline drawing tool
     */
    deactivate(): void {
        if (!this._active || !this._chart) return;
        
        // Update button state
        if (this._toolbarButton) {
            this._toolbarButton.style.backgroundColor = 'rgba(255, 255, 255, 0.85)';
            this._toolbarButton.style.color = '#333';
        }
        
        // Unsubscribe from events
        if (this._clickHandler) {
            this._chart.unsubscribeClick(this._clickHandler);
            this._clickHandler = null;
        }
        
        if (this._moveHandler) {
            this._chart.unsubscribeCrosshairMove(this._moveHandler);
            this._moveHandler = null;
        }
        
        this._active = false;
        this._chart = null;
        this._series = null;
        this._tempPoint = null;
        this._updateView();
    }

    /**
     * Add a point to the polyline
     */
    private _addPoint(point: PolylinePoint): void {
        console.log('🟢 _addPoint called with:', point);
        
        // Make sure we have both time and price
        if (point.time === undefined || point.time === null || point.price === undefined || point.price === null) {
            console.error('❌ Cannot add point - invalid time or price:', point);
            return;
        }
        
        // Add the point to our array
        this._points.push(point);
        
        console.log(`📊 Points array now has ${this._points.length} points:`, JSON.stringify(this._points));
        
        // Force update all pane views immediately
        this._paneViews.forEach(view => {
            if ('update' in view && typeof view.update === 'function') {
                view.update();
            }
        });
        
        // Then request chart update
        this._updateView();
    }

    /**
     * Clear all points in the polyline
     */
    clearPoints(): void {
        this._points = [];
        this._tempPoint = null;
        this._updateView();
    }

    /**
     * Update the view
     */
    private _updateView(): void {
        console.log('🔄 Requesting view update');
        if (this._requestUpdate) {
            console.log('✅ Calling requestUpdate function');
            this._requestUpdate();
        } else {
            console.log('⚠️ Cannot update view: requestUpdate not available');
        }
    }

    /**
     * Set polyline options
     */
    applyOptions(options: Partial<PolylineOptions>): void {
        this._options = { ...this._options, ...options };
        this._updateView();
    }

    /**
     * Get current points
     */
    getPoints(): PolylinePoint[] {
        return [...this._points];
    }

    /**
     * ISeriesPrimitive implementation
     */
    paneViews(): IPrimitivePaneView[] {
        console.log('📊 paneViews called, returning:', this._paneViews.length, 'views');
        console.log('  Current points count:', this._points.length);
        
        // Force the pane view to update before returning it
        if (this._paneViews.length > 0) {
            this._paneViews[0].update();
        }
        
        return this._paneViews;
    }

    attached({ requestUpdate }: SeriesAttachedParameter<Time>): void {
        console.log('🔌 Polyline tool attached to series');
        this._requestUpdate = requestUpdate;
        console.log('✅ requestUpdate function received:', !!requestUpdate);
    }

    detached(): void {
        this.deactivate();
        this._requestUpdate = null;
    }

    /**
     * Get the chart instance
     */
    get chart(): IChartApi | null {
        return this._chart;
    }

    /**
     * Get the series instance
     */
    get series(): ISeriesApi<SeriesType> | null {
        return this._series;
    }
}