import { createChart, AreaSeries } from 'lightweight-charts';
import { generateLineData } from '../../../sample-data';
import { PolylineDrawingTool } from '../polyline-drawing-tool';

// Get the chart container
const chartContainer = document.getElementById('chart');

// Create chart
const chart = ((window as unknown as any).chart = createChart('chart', {
    autoSize: true,
    layout: {
        background: { color: '#ffffff' },
        textColor: '#333333',
    },
    grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
    },
    crosshair: {
        mode: 1, // Mode 1 shows the crosshair at all times
        vertLine: {
            visible: true,
            labelVisible: false,
        },
        horzLine: {
            visible: true,
            labelVisible: false,
        }
    },
}));
const lineSeries = chart.addSeries(AreaSeries, {
    lineColor: 'rgba(41, 98, 255, 0.7)',
    lineWidth: 2,
    topColor: 'rgba(41, 98, 255, 0.3)',
    bottomColor: 'rgba(41, 98, 255, 0.1)',
});

// Generate sample data
lineSeries.setData(generateLineData());

// Create polyline drawing tool
const polylineTool = new PolylineDrawingTool({
    color: '#2962FF',
    lineWidth: 2,
    lineStyle: 'solid',
    pointRadius: 4,
    pointColor: '#2962FF'
});

// Attach polyline to the series
lineSeries.attachPrimitive(polylineTool);
console.log('Polyline tool attached to series');

// Setup the toolbar
if (chartContainer) {
    polylineTool.setupToolbar(chartContainer);
    console.log('Toolbar setup complete');
    
    // Store references to important objects
    polylineTool.activate(chart, lineSeries);
    console.log('Polyline tool activated:', polylineTool._active);
    
    // Add test button for manually adding a point
    const testButton = document.createElement('button');
    testButton.textContent = 'Add Test Point';
    testButton.style.position = 'absolute';
    testButton.style.bottom = '10px';
    testButton.style.right = '10px';
    testButton.addEventListener('click', () => {
        // Add a test point manually
        const testPoint = {
            time: chart.timeScale().getVisibleLogicalRange()?.from || 0,
            price: 25.0
        };
        console.log('About to add test point:', testPoint);
        
        // Log state before
        console.log('Points before:', polylineTool._points.length, JSON.stringify(polylineTool._points));
        
        polylineTool._addPoint(testPoint);
        
        // Log state after
        console.log('Points after:', polylineTool._points.length, JSON.stringify(polylineTool._points));
        console.log('Test point added manually - should show in next render cycle');
        
        // Force a manual update of the view
        console.log('Manually triggering update...');
        polylineTool._updateView();
    });
    chartContainer.appendChild(testButton);
    
    // Enable debugging
    (window as any).polylineTool = polylineTool;
    (window as any).chart = chart;
    (window as any).lineSeries = lineSeries;
}

// Additional line style control from the existing buttons (optional)
const lineStyleSelect = document.getElementById('lineStyle') as HTMLSelectElement;
if (lineStyleSelect) {
    lineStyleSelect.addEventListener('change', () => {
        polylineTool.applyOptions({
            lineStyle: lineStyleSelect.value as 'solid' | 'dashed',
        });
    });
}

// Fit content
chart.timeScale().fitContent();

// Handle resize
window.addEventListener('resize', () => {
    chart.applyOptions({
        width: chart.chartElement().clientWidth,
        height: chart.chartElement().clientHeight,
    });
});