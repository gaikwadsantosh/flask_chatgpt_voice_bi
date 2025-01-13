let audioContext;
let mediaStream;
let recorder;
let isRecording = false;

const toggleButton = document.getElementById('toggleRecord');
const audioPlayback = document.getElementById('audioPlayback');
const recognizedTextDiv = document.getElementById('recognizedText');
//const chartContainer = document.getElementById('chartContainer');
//<div id="chartContainer" style="width: 100%; height: auto;"></div>

//const datatableDiv = document.getElementById('data-table');
//const datatableMainDiv = document.getElementById('dataTableMainDiv');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessageDiv = document.getElementById('errorMessageDiv');

function showLoading() {
    if (loadingIndicator) {
        loadingIndicator.style.display = 'inline-block'; // Show the spinner
    } else {
        console.error("Loading indicator not found in the DOM.");
    }
}

function hideLoading() {
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none'; // Hide the spinner
    } else {
        console.error("Loading indicator not found in the DOM.");
    }
}

toggleButton.addEventListener('click', async () => {
    if (!isRecording) {
        //Clear form
        ['recognizedText', 'tsqlQuery', 'chartType', 'dataTableMainDiv', 'errorMessageDiv', 'chartContainer', 'data-table'].forEach(id => {
            const div = document.getElementById(id);
            if (div) {
                div.style.display = 'none'; 
            }
        });

        //showLoading();
        document.getElementById('recognizedText').style.color = 'black'

        // Start Recording
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const input = audioContext.createMediaStreamSource(mediaStream);

        recorder = new Recorder(input, { numChannels: 1 });
        recorder.record();
        console.log("Recording started...");

        toggleButton.textContent = 'Stop Recording Command ...';
        toggleButton.classList.replace('btn-primary', 'btn-danger');
        isRecording = true;
    } else {
        // Stop Recording
        recorder.stop();
        console.log("Recording stopped.");

        showLoading();

        // Export audio as WAV and send to backend
        recorder.exportWAV(blob => {
            const audioURL = URL.createObjectURL(blob);
            audioPlayback.src = audioURL;

            const formData = new FormData();
            formData.append('audio', blob, 'audio.wav'); // Provide a filename for the Blob

            // Send the audio file to the backend API
            fetch('/api/speech_to_text_api', {
                method: 'POST',
                body: formData,
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log("Recognized Text:", data.text);

                    // Display recognized text
                    recognizedTextDiv.style.display = 'block';
                    recognizedTextDiv.className = 'result-box';
                    recognizedTextDiv.innerHTML = `
                        <strong>Recognized Text:</strong>
                        <span>${data.text || "No speech recognized."}</span>
                    `;

                    // Call API to generate T-SQL and chart data
                    return fetch('/api/text_to_sql_api', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text_command: data.text }),
                    });
                })
                .then(response => {
                    // Check for successful response (status code 2xx)
                    if (!response.ok) {
                      // If not successful, try to get the error message from the response text
                      return response.text().then(errorMessage => {
                        throw new Error(errorMessage || `HTTP error! status: ${response.status}`); 
                      });
                    }
                  
                    // If successful, proceed with parsing the JSON response
                    return response.json(); 
                })
                .then(sqlData => {
                    console.log("Generated T-SQL Query:", sqlData.tsql_query);
                    console.log("Recommended Chart Type:", sqlData.chart_type);
                    console.log("Data:", sqlData.data);

                    // Display Chart Type
                    let chartTypeDiv = document.getElementById('chartType');
                    if (!chartTypeDiv) {
                        chartTypeDiv = document.createElement('div');
                        chartTypeDiv.id = 'chartType';
                        chartTypeDiv.className = 'result-box';
                        recognizedTextDiv.insertAdjacentElement('afterend', chartTypeDiv);
                    }
                    chartTypeDiv.style.display = 'block';
                    chartTypeDiv.innerHTML = `
                        <strong>Recommended Chart Type:</strong>
                        <span>${sqlData.chart_type}</span>
                    `;

                    // Display T-SQL Query
                    let tsqlDiv = document.getElementById('tsqlQuery');
                    if (!tsqlDiv) {
                        tsqlDiv = document.createElement('div');
                        tsqlDiv.id = 'tsqlQuery';
                        tsqlDiv.className = 'result-box';
                        chartTypeDiv.insertAdjacentElement('afterend', tsqlDiv);
                    }
                    tsqlDiv.style.display = 'block';
                    tsqlDiv.innerHTML = `
                        <strong>Generated T-SQL Query:</strong>
                        <pre>${sqlData.tsql_query}</pre>
                    `;

                    if (sqlData.data.length === 0) {
                        //datatableMainDiv.style.display = 'none';
                        errorMessageDiv.style.display = 'block';
                        errorMessageDiv.style.color = 'red'
                        errorMessageDiv.className = 'result-box';
                        errorMessageDiv.innerHTML = 'No Records found. Please try with different criteria.';                        
                        console.info("Data source is empty or undefined.");
                        return;
                    }
                
                    try {
                        // Check if the chartContainer exists
                        const oldContainer = document.getElementById('chartContainer');
                        if (oldContainer) {
                            // Remove the old container
                            oldContainer.parentNode.removeChild(oldContainer);
                        }
                        // Create a new chart container
                        const chartContainer = document.createElement('div');
                        chartContainer.id = 'chartContainer';
                        // Insert the new container after the T-SQL div
                        tsqlDiv.insertAdjacentElement('afterend', chartContainer);
                        // Set its display style
                        chartContainer.style.display = 'block';
                        //chartContainer.style.width = '100%'; // 
                        //chartContainer.style.height = '500px'; // 
                        
                        //plot chart
                        renderChart(sqlData.chart_type, chartContainer, sqlData.data);

                        //datatableMainDiv.style.display = 'block';
                        //datatableMainDiv.className = 'result-box';

                        // Check if the data-table exists
                        const olDdataTable = document.getElementById('data-table');
                        if (olDdataTable) {
                            olDdataTable.parentNode.removeChild(olDdataTable);
                        }
                        const dataTableDiv = document.createElement('div');
                        dataTableDiv.id = 'data-table';
                        chartContainer.insertAdjacentElement('afterend', dataTableDiv);
                        dataTableDiv.style.display = 'block';
                        dataTableDiv.className = 'result-box';
                        //Render Data Table
                        renderChart("DataGrid", dataTableDiv, sqlData.data);
                    } catch (error) {
                        console.error("Error rendering chart:", error);

                        if (chartContainer) {
                            chartContainer.innerHTML = '<strong>An error occurred while rendering the chart. Please try again.</strong>';
                        }
                    }
                })
                .catch(error => {
                    document.getElementById('recognizedText').style.color = 'red'
                    document.getElementById('recognizedText').innerHTML = `${error} Please try again.`;
                    console.error(error);
                })
                .finally(() => {
                    // Hide spinner after all API calls
                    hideLoading();
                });                
        });

        // Update button state
        toggleButton.textContent = 'Start Recording Command ...';
        toggleButton.classList.replace('btn-danger', 'btn-primary');
        isRecording = false;
    }
});
