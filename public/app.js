document.addEventListener('DOMContentLoaded', () => {
    const studentForm = document.getElementById('studentForm');
    const responseArea = document.getElementById('responseArea');
    const aiFormExtractForm = document.getElementById('aiFormExtractForm');
    const aiResponseArea = document.getElementById('aiResponseArea');
    const formImageUpload = document.getElementById('formImageUpload');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const scanButton = document.getElementById('scanButton');
    const cameraModal = document.getElementById('cameraModal');
    const cameraFeed = document.getElementById('cameraFeed');
    const photoCanvas = document.getElementById('photoCanvas');
    const captureButton = document.getElementById('captureButton');
    const closeDialogButtons = document.querySelectorAll('.close-modal-button');
    const aiModelSelect = document.getElementById('aiModelSelect'); // Get the model select element

    // New elements for name review
    const reviewStudentNameSection = document.getElementById('reviewStudentNameSection');
    const studentSurnameInput = document.getElementById('studentSurname');
    const studentFirstNameInput = document.getElementById('studentFirstName');
    const studentOtherNameInput = document.getElementById('studentOtherName');

    // Settings Section Elements
    const apiKeyForm = document.getElementById('apiKeyForm');
    const openRouterApiKeyInput = document.getElementById('openRouterApiKey');
    const apiKeyCountElement = document.getElementById('apiKeyCount');
    const settingsResponseArea = document.getElementById('settingsResponseArea');

    let stream = null;
    let currentStudentDataForSubmission = null; // To store the full AI extracted data

    // --- Utility to display messages ---
    function displayMessage(areaElement, message, isSuccess, jsonData = null) {
        if (!areaElement) return; // Guard against null areaElement
        areaElement.innerHTML = ''; 
        const messageP = document.createElement('p');
        messageP.textContent = message;
        areaElement.appendChild(messageP);

        if (jsonData && areaElement.id === 'aiResponseArea') { 
            console.log("AI Extracted Data (for diagnostics):", JSON.stringify(jsonData, null, 2));
        }
        
        areaElement.className = isSuccess ? 'success' : 'error';
        if (!(areaElement.id === 'aiResponseArea' && isSuccess && jsonData)) { // Keep AI success message with data visible longer
             setTimeout(() => {
                if (areaElement) {
                    areaElement.className = 'hidden';
                    areaElement.innerHTML = '';
                }
            }, 7000);
        }
    }

    // --- Image Preview ---
    if (formImageUpload) {
        formImageUpload.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    if (imagePreview && imagePreviewContainer) {
                        imagePreview.src = e.target.result;
                        imagePreviewContainer.classList.remove('hidden');
                    }
                }
                reader.readAsDataURL(file);
            } else {
                if (imagePreviewContainer) imagePreviewContainer.classList.add('hidden');
            }
        });
    }
    
    // --- Camera Modal Logic ---
    async function startCamera() {
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: 'environment',
                        width: { ideal: 1920 }, 
                        height: { ideal: 1080 }
                    } 
                });
                if (cameraFeed) cameraFeed.srcObject = stream;
                if (cameraModal) cameraModal.showModal();
            } else {
                displayMessage(aiResponseArea, 'getUserMedia not supported on this browser.', false);
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            let message = 'Error accessing camera. ';
            if (err.name === "NotAllowedError") {
                message += "Permission denied. Please allow camera access.";
            } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                message += "No camera found. Ensure a camera is connected and enabled.";
            } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
                message += "Camera is already in use or cannot be started.";
            } else {
                message += err.message;
            }
            displayMessage(aiResponseArea, message, false);
        }
    }

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        if (cameraFeed) cameraFeed.srcObject = null;
    }

    if (scanButton) {
        scanButton.addEventListener('click', startCamera);
    }

    if (captureButton && cameraFeed && photoCanvas && formImageUpload && imagePreview && imagePreviewContainer) {
        captureButton.addEventListener('click', () => {
            const videoElement = cameraFeed;
            const canvasElement = photoCanvas;
            const context = canvasElement.getContext('2d');
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
            context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
            canvasElement.toBlob(blob => {
                if (blob) {
                    const file = new File([blob], "capture.png", { type: "image/png" });
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    formImageUpload.files = dataTransfer.files;
                    const changeEvent = new Event('change');
                    formImageUpload.dispatchEvent(changeEvent);
                }
            }, 'image/png');
            if (cameraModal) cameraModal.close();
            stopCamera();
        });
    }

    if (closeDialogButtons) {
        closeDialogButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (cameraModal && cameraModal.open) {
                    cameraModal.close();
                }
            });
        });
    }
    if (cameraModal) {
        cameraModal.addEventListener('close', stopCamera);
    }


    // --- AI Form Data Extraction ---
    if (aiFormExtractForm) {
        aiFormExtractForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            if (aiResponseArea) {
                aiResponseArea.className = 'hidden';
                aiResponseArea.innerHTML = ''; 
            }
            if (reviewStudentNameSection) reviewStudentNameSection.classList.add('hidden');
            currentStudentDataForSubmission = null; // Clear previous data

            const formData = new FormData(); // Create a new FormData object
            const imageFile = formImageUpload.files[0]; // Get the image file

            if (!imageFile || (imageFile instanceof File && imageFile.size === 0)) {
                displayMessage(aiResponseArea, 'Please select an image or use the camera.', false);
                return;
            }
            formData.append('formImage', imageFile); // Append the image file

            if (aiModelSelect) {
                formData.append('aiModel', aiModelSelect.value); // Append selected AI model
            } else {
                formData.append('aiModel', 'qwen/qwen2.5-vl-72b-instruct:free'); // Default if somehow not found
            }
            
            const extractButton = document.getElementById('extractDataButton');
            if (extractButton) extractButton.setAttribute('aria-busy', 'true');

            try {
                // Note: The backend endpoint was previously /api/extract-student-data, 
                // the existing code uses /api/extract-form-data. I'll stick to /api/extract-form-data
                // as per the existing code block. If this needs to change, let me know.
                const response = await fetch('/api/extract-form-data', {
                    method: 'POST',
                    body: formData, 
                });
                const result = await response.json();

                if (result.studentData) { 
                    currentStudentDataForSubmission = result.studentData; // Store full data
                    
                    if (studentSurnameInput) studentSurnameInput.value = result.studentData['student.Surname'] || '';
                    if (studentFirstNameInput) studentFirstNameInput.value = result.studentData['student.FirstName'] || '';
                    if (studentOtherNameInput) studentOtherNameInput.value = result.studentData['student.OtherName'] || '';
                    
                    if (reviewStudentNameSection) reviewStudentNameSection.classList.remove('hidden');
                    
                    displayMessage(aiResponseArea, result.message || 'Data extracted. Please review student name below.', result.success, result.studentData);
                } else { 
                    displayMessage(aiResponseArea, result.message || 'Failed to extract data.', false, result.errorDetails ? result.errorDetails : null);
                }
            } catch (error) {
                console.error('Error extracting data:', error);
                displayMessage(aiResponseArea, `Client-side error: ${error.message}`, false);
            } finally {
                if (extractButton) extractButton.removeAttribute('aria-busy');
            }
        });
    }

    // --- BEMIS Manual Submission ---
    if (studentForm) {
        studentForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            if (responseArea) responseArea.className = 'hidden';

            const schoolIdElement = document.getElementById('schoolId');
            const schoolId = schoolIdElement ? schoolIdElement.value : '';
            
            if (!currentStudentDataForSubmission) {
                displayMessage(responseArea, 'No student data extracted or loaded. Please extract data first.', false);
                return;
            }

            if (studentSurnameInput) currentStudentDataForSubmission['student.Surname'] = studentSurnameInput.value;
            if (studentFirstNameInput) currentStudentDataForSubmission['student.FirstName'] = studentFirstNameInput.value;
            if (studentOtherNameInput) currentStudentDataForSubmission['student.OtherName'] = studentOtherNameInput.value;
            
            const submitBemisButton = document.getElementById('submitBemisButton');
            if (submitBemisButton) submitBemisButton.setAttribute('aria-busy', 'true');

            // Fetch current API key for BEMIS submission (as it's needed by the /api/submit-student endpoint)
            let apiKeyForSubmission = '';
            try {
                const apiKeyRes = await fetch('/api/settings/apikeys/current'); // Assuming this endpoint exists
                if (apiKeyRes.ok) {
                    const apiKeyData = await apiKeyRes.json();
                    if (apiKeyData.success && apiKeyData.apiKey) {
                        apiKeyForSubmission = apiKeyData.apiKey;
                    } else {
                        throw new Error(apiKeyData.message || "API Key not found or error in response.");
                    }
                } else {
                    const errorText = await apiKeyRes.text();
                    throw new Error(`Failed to fetch API key: ${apiKeyRes.status} ${errorText}`);
                }
            } catch (e) {
                console.error("Error fetching API key for BEMIS submission:", e);
                displayMessage(responseArea, `Error fetching API key: ${e.message}. Please add API Key in Settings.`, false);
                if (submitBemisButton) submitBemisButton.removeAttribute('aria-busy');
                return;
            }


            try {
                // The backend /api/submit-student endpoint expects schoolId and studentData (and implicitly uses the stored API key)
                const response = await fetch('/api/submit-student', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        schoolId, 
                        studentData: currentStudentDataForSubmission,
                        // The backend /api/submit-student seems to get the API key from its own service,
                        // so we don't explicitly send it here unless the backend endpoint changes.
                        // The previous version of this frontend code was sending it to /api/submit-to-bemis
                        // which is different. I'm aligning with the existing /api/submit-student structure.
                    }),
                });
                const result = await response.json();
                displayMessage(responseArea, result.message, result.success);
                if (!result.success && result.data) { // If BEMIS returned specific errors
                     const detailsPre = document.createElement('pre');
                     detailsPre.textContent = JSON.stringify(result.data, null, 2);
                     if (responseArea) responseArea.appendChild(detailsPre);
                }

            } catch (error) {
                console.error('Error submitting data:', error);
                displayMessage(responseArea, `Client-side error: ${error.message}`, false);
            } finally {
                 if (submitBemisButton) submitBemisButton.removeAttribute('aria-busy');
            }
        });
    }

    // --- Settings: API Key Management ---
    async function fetchApiKeyCount() {
        if (!apiKeyCountElement) return;
        try {
            // Assuming the endpoint is /api/settings/apikeys/count based on previous context
            const response = await fetch('/api/settings/apikeys/count'); 
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            if (result.success) {
                apiKeyCountElement.textContent = result.count;
            } else {
                apiKeyCountElement.textContent = 'Error';
                displayMessage(settingsResponseArea, result.message || 'Failed to fetch API key count.', false);
            }
        } catch (error) {
            console.error('Error fetching API key count:', error);
            apiKeyCountElement.textContent = 'Error';
            displayMessage(settingsResponseArea, `Client-side error fetching count: ${error.message}`, false);
        }
    }

    if (apiKeyForm && openRouterApiKeyInput && settingsResponseArea) {
        apiKeyForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            if(settingsResponseArea) settingsResponseArea.className = 'hidden';
            const apiKey = openRouterApiKeyInput.value.trim();

            if (!apiKey) {
                displayMessage(settingsResponseArea, 'Please enter an API key.', false);
                return;
            }

            const addApiKeyButton = document.getElementById('addApiKeyButton');
            if (addApiKeyButton) addApiKeyButton.setAttribute('aria-busy', 'true');

            try {
                 // Assuming the endpoint is /api/settings/apikeys based on previous context
                const response = await fetch('/api/settings/apikeys', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiKey }),
                });
                const result = await response.json();
                displayMessage(settingsResponseArea, result.message, result.success);
                if (result.success) {
                    openRouterApiKeyInput.value = ''; 
                    if (result.count !== undefined && apiKeyCountElement) {
                        apiKeyCountElement.textContent = result.count;
                    } else {
                        fetchApiKeyCount(); 
                    }
                }
            } catch (error) {
                console.error('Error adding API key:', error);
                displayMessage(settingsResponseArea, `Client-side error adding key: ${error.message}`, false);
            } finally {
                if (addApiKeyButton) addApiKeyButton.removeAttribute('aria-busy');
            }
        });
    }

    // Initial fetch of API key count
    fetchApiKeyCount();

});