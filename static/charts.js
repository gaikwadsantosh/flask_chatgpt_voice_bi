function renderChart(chartType, containerId, dataSource) {

    const chartContainer = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;

    // Ensure the container exists
    if (!chartContainer) {
        console.error(`Container with id '${containerId}' not found.`);
        return;
    }

    if (!dataSource || dataSource.length === 0) {
        $('#dataTableMainDiv').hide();
        console.error("Data source is empty or undefined.");
        return;
    }
    
    // Handle single-column, single-row dataset for Pie chart
    if (chartType === "Pie" && Object.keys(dataSource[0]).length === 1 && dataSource.length === 1) {
        const originalColumnName = Object.keys(dataSource[0])[0];
        const originalValue = dataSource[0][originalColumnName];
        const total = 100; // Assume total is 100 for percentage-based data
        const othersValue = Math.max(total - originalValue, 0);
    
        // Transform the data for Pie chart
        dataSource = [
            { Label: originalColumnName, Value: originalValue },
            { Label: "Others", Value: othersValue },
        ];
    }else if (Object.keys(dataSource[0]).length === 1){
        // Convert the single key-value pair into an array of objects for the chart
        dataSource = Object.keys(dataSource[0]).map(key => ({
            category: key,
            value: dataSource[0][key]
        }));
    }
    
    let argumentField = null;
    let valueField = null;
    
    const keys = Object.keys(dataSource[0]);
    
    // First loop: Assign string column to argumentField
    for (const key of keys) {
        const sampleValue = dataSource[0][key];
        if (typeof sampleValue === "string" && !argumentField) {
            argumentField = key;
            break; // Exit loop once argumentField is assigned
        }
    }
    
    // Second loop: Assign float/decimal column to valueField
    for (const key of keys) {
        const sampleValue = dataSource[0][key];
        if (typeof sampleValue === "number" && !Number.isInteger(sampleValue) && !valueField) {
            valueField = key;
            break; // Exit loop once valueField is assigned
        }
    }
    
    // Second loop: Assign int column to valueField
    for (const key of keys) {
        const sampleValue = dataSource[0][key];
        if (typeof sampleValue === "number" && !valueField) {
            valueField = key;
            break; // Exit loop once valueField is assigned
        }
    }

    // Fallback: If no string column, find integer column for argumentField
    if (!argumentField) {
        for (const key of keys) {
            const sampleValue = dataSource[0][key];
            if (typeof sampleValue === "number" && Number.isInteger(sampleValue)) {
                argumentField = key;
                break;
            }
        }
    }
    
    if (!argumentField || !valueField) {
        valueField = keys[0]
        argumentField = keys[1]
    }
        
    // Validate that both fields were identified
    if (!argumentField || !valueField) {
        console.error("Could not identify argumentField or valueField from dataSource.");
        console.error("Data Source:", dataSource);
        return;
    }

    console.log(`Using argumentField: ${argumentField}, valueField: ${valueField}`);
    
    const options = {
        dataSource,
        title: {
            text: `${chartType} Chart`
        },
        argumentAxis: {
            title: argumentField
        },
        valueAxis: {
            title: valueField
        }
    };

    switch (chartType) {
        case 'Pie':
            $(containerId).dxPieChart({
                ...options,
                series: [{
                    argumentField,
                    valueField,
                    label: {
                        visible: true,
                        format: 'fixedPoint',
                        connector: {
                            visible: true
                        }
                    }
                }]
            });
            break;

        case 'Line':
            $(containerId).dxChart({
                ...options,
                series: [{
                    argumentField,
                    valueField,
                    name:"",
                    type: "line"
                }]
            });
            break;

        case 'Bar':
            $(containerId).dxChart({
                ...options,
                series: [{
                    argumentField,
                    valueField,
                    name:"",
                    type: "bar"
                }]
            });
            break;

        case 'StackedBar':
            $(containerId).dxChart({
                ...options,
                series: [{
                    argumentField,
                    valueField,
                    name:"",
                    type: "stackedBar"
                }]
            });
            break;
        case 'DataGrid':
            $('#dataTableMainDiv').show(); 
            const columns = Object.keys(dataSource[0]).map(key => ({
                dataField: key,
                caption: key.charAt(0).toUpperCase() + key.slice(1) // Capitalize first letter for display
            }));

            $(containerId).dxDataGrid({
                dataSource,
                columns,
                showBorders:true,
                paging:{ pageSize : 10 },
            });
            break;
        default:
            chartContainer.innerHTML = '<strong>Unsupported chart type.</strong>';
            console.error("Unsupported chart type:", chartType);
    }
}
