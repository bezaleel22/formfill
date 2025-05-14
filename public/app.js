document.addEventListener('DOMContentLoaded', () => {
    // --- Landing Page Elements ---
    const ctaHeroToAppButton = document.getElementById('cta-hero-to-app');
    const ctaNavToAppButton = document.getElementById('cta-nav-to-app');
    const appSection = document.getElementById('the-app-section');
    const fadeInSections = document.querySelectorAll('.fade-in-section');

    // --- Main Form Elements (App) ---
    const studentForm = document.getElementById('studentForm'); 
    const aiFormExtractForm = document.getElementById('aiFormExtractForm');
    const formImageUpload = document.getElementById('formImageUpload');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const imagePreview = document.getElementById('imagePreview');
    
    // --- UI Control Elements (App) ---
    const extractionProgressBarContainer = document.getElementById('extractionProgressBarContainer');
    const inlineReviewSubmitControls = document.getElementById('inlineReviewSubmitControls'); 
    const submitBemisButton = document.getElementById('submitBemisButton'); 

    // --- Name Review (within inlineReviewSubmitControls - App) ---
    const studentFullNameInput = document.getElementById('studentFullName');

    // --- Camera Elements (App) ---
    const mobileScanButton = document.getElementById('mobileScanButton');
    const cameraModal = document.getElementById('cameraModal');
    const cameraFeed = document.getElementById('cameraFeed');
    const photoCanvas = document.getElementById('photoCanvas');
    const captureButton = document.getElementById('captureButton');
    const closeCameraModalButton = document.getElementById('closeCameraModalButton');

    // --- Settings Elements (App - in a tab) ---
    const aiModelSelect = document.getElementById('aiModelSelect'); 
    const schoolIdInput = document.getElementById('schoolId'); 
    const apiKeyForm = document.getElementById('apiKeyForm');
    const openRouterApiKeyInput = document.getElementById('openRouterApiKey');
    const addApiKeyButton = document.getElementById('addApiKeyButton'); 
    const apiKeyCountElement = document.getElementById('apiKeyCount');
    const sessionCookieForm = document.getElementById('sessionCookieForm');
    const bemisSessionCookieInput = document.getElementById('bemisSessionCookie');
    const saveSessionCookieButton = document.getElementById('saveSessionCookieButton'); 
    
    // --- Response Area Wrappers (App) ---
    const aiResponseAreaWrapper = document.getElementById('aiResponseAreaWrapper');
    const bemisResponseAreaWrapper = document.getElementById('bemisResponseAreaWrapper'); 
    const settingsResponseAreaWrapper = document.getElementById('settingsResponseAreaWrapper'); 
    const sessionResponseAreaWrapper = document.getElementById('sessionResponseAreaWrapper'); 

    // --- Tab Elements (App) ---
    const aiExtractTabButton = document.getElementById('aiExtractTabButton');
    const settingsTabButton = document.getElementById('settingsTabButton');
    const aiExtractTabPane = document.getElementById('aiExtractTabPane');
    const settingsTabPane = document.getElementById('settingsTabPane');

    // --- Dropzone (App) ---
    const dropZoneLabel = document.getElementById('dropZoneLabel');

    let stream = null;
    let currentStudentDataForSubmission = null;
    let isExtracting = false;

    // --- Landing Page Interactivity ---
    function scrollToAppSection() {
        if (appSection) {
            appSection.scrollIntoView({ behavior: 'smooth' });
        }
    }
    if (ctaHeroToAppButton) {
        ctaHeroToAppButton.addEventListener('click', scrollToAppSection);
    }
    if (ctaNavToAppButton) {
        ctaNavToAppButton.addEventListener('click', scrollToAppSection);
    }

    // Intersection Observer for fade-in sections
    const sectionObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Optional: stop observing after animation
            }
        });
    }, { threshold: 0.1 }); // Trigger when 10% of the section is visible

    fadeInSections.forEach(section => {
        sectionObserver.observe(section);
    });


    // --- Utility to display messages (App) ---
    function displayMessage(areaWrapperElement, message, isSuccess, jsonData = null) {
        if (!areaWrapperElement) return;
        areaWrapperElement.innerHTML = ''; 

        const alertDiv = document.createElement('div');
        alertDiv.classList.add('alert', 'flex', 'items-start', 'shadow-lg'); 

        let iconSvg = '';
        let statusText = '';

        if (isSuccess) {
            alertDiv.classList.add('alert-success');
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="alert-icon stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
            statusText = 'Success';
        } else {
            alertDiv.classList.add('alert-error');
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="alert-icon stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
            statusText = 'Error';
        }
        
        alertDiv.innerHTML = `${iconSvg} <div class="flex flex-col"><span>${statusText}</span><span class="text-xs">${message}</span></div>`;
        areaWrapperElement.appendChild(alertDiv);
        areaWrapperElement.classList.remove('hidden');

        const autoHide = !(areaWrapperElement.id === 'aiResponseAreaWrapper' && isSuccess && jsonData); 
        if (autoHide) {
            setTimeout(() => {
                alertDiv.style.opacity = '0';
                alertDiv.style.transition = 'opacity 0.5s ease-out';
                setTimeout(() => alertDiv.remove(), 500);
            }, 7000);
        }
    }

    // --- Tab Switching Logic (App) ---
    function switchTab(activeButton, activePane) {
        if (!aiExtractTabButton || !settingsTabButton || !aiExtractTabPane || !settingsTabPane) return;
        [aiExtractTabButton, settingsTabButton].forEach(button => button.classList.remove('active'));
        [aiExtractTabPane, settingsTabPane].forEach(pane => pane.classList.add('hidden'));

        if (activeButton) activeButton.classList.add('active');
        if (activePane) activePane.classList.remove('hidden');
    }

    if (aiExtractTabButton && settingsTabButton && aiExtractTabPane && settingsTabPane) {
        aiExtractTabButton.addEventListener('click', () => switchTab(aiExtractTabButton, aiExtractTabPane));
        settingsTabButton.addEventListener('click', () => switchTab(settingsTabButton, settingsTabPane));
    }


    // --- Dropzone Logic (App) ---
    if (dropZoneLabel && formImageUpload) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZoneLabel.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false); // For broader drop coverage
        });
        function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
        ['dragenter', 'dragover'].forEach(eventName => dropZoneLabel.addEventListener(eventName, () => dropZoneLabel.classList.add('dragover'), false));
        ['dragleave', 'drop'].forEach(eventName => dropZoneLabel.addEventListener(eventName, () => dropZoneLabel.classList.remove('dragover'), false));
        dropZoneLabel.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                formImageUpload.files = files;
                formImageUpload.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, false);
    }
    
    // --- AI Form Data Extraction (App - triggered on file change) ---
    async function handleAiExtraction() {
        if (isExtracting) return;
        isExtracting = true;

        if (aiResponseAreaWrapper) aiResponseAreaWrapper.innerHTML = '';
        if (bemisResponseAreaWrapper) bemisResponseAreaWrapper.innerHTML = ''; 
        
        if (inlineReviewSubmitControls) {
            inlineReviewSubmitControls.classList.add('hidden', 'opacity-0', '-translate-y-2');
        }
        currentStudentDataForSubmission = null;

        const formData = new FormData();
        const imageFile = formImageUpload.files[0];

        if (!imageFile || (imageFile instanceof File && imageFile.size === 0)) {
            displayMessage(aiResponseAreaWrapper, 'Please select an image or use the camera.', false);
            isExtracting = false;
            return;
        }
        formData.append('formImage', imageFile);
        formData.append('aiModel', aiModelSelect ? aiModelSelect.value : 'qwen/qwen2.5-vl-72b-instruct:free');
        
        if (extractionProgressBarContainer) extractionProgressBarContainer.classList.remove('hidden');

        try {
            const response = await fetch('/api/extract-form-data', {
                method: 'POST',
                body: formData, 
            });
            const result = await response.json();

            if (result.success && result.studentData) { 
                currentStudentDataForSubmission = result.studentData;
                const surname = result.studentData['student.Surname'] || '';
                const firstname = result.studentData['student.FirstName'] || '';
                const otherName = result.studentData['student.OtherName'] || '';
                if (studentFullNameInput) {
                    studentFullNameInput.value = `${surname} ${firstname} ${otherName}`.trim().replace(/\s+/g, ' ');
                }
                displayMessage(aiResponseAreaWrapper, result.message || 'Data extracted. Review name and submit.', true, result.studentData);
                
                if (inlineReviewSubmitControls) {
                    inlineReviewSubmitControls.classList.remove('hidden');
                    setTimeout(() => { 
                        inlineReviewSubmitControls.classList.remove('opacity-0', '-translate-y-2');
                        inlineReviewSubmitControls.classList.add('opacity-100', 'translate-y-0');
                    }, 50); 
                }
            } else { 
                displayMessage(aiResponseAreaWrapper, result.message || 'Failed to extract data.', false, result.errorDetails || null);
                if (inlineReviewSubmitControls) inlineReviewSubmitControls.classList.add('hidden', 'opacity-0', '-translate-y-2');
            }
        } catch (error) {
            displayMessage(aiResponseAreaWrapper, `Client-side error: ${error.message}`, false);
            if (inlineReviewSubmitControls) inlineReviewSubmitControls.classList.add('hidden', 'opacity-0', '-translate-y-2');
        } finally {
            if (extractionProgressBarContainer) extractionProgressBarContainer.classList.add('hidden');
            isExtracting = false;
        }
    }

    // --- Image Preview & Trigger Extraction (App) ---
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
                handleAiExtraction(); 
            } else {
                if (imagePreviewContainer) imagePreviewContainer.classList.add('hidden');
                if (inlineReviewSubmitControls) inlineReviewSubmitControls.classList.add('hidden', 'opacity-0', '-translate-y-2');
            }
        });
    }
    
    // --- Camera Modal Logic (App) ---
    async function startCamera() { 
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                displayMessage(aiResponseAreaWrapper, 'Camera access (getUserMedia API) is not supported by your browser.', false); 
                if (cameraModal) cameraModal.classList.add('hidden');
                return;
            }
            if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                displayMessage(aiResponseAreaWrapper, 'Camera access requires a secure connection (HTTPS). Your current connection is not secure.', false);
                if (cameraModal) cameraModal.classList.add('hidden');
                return;
            }
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } });
            if (cameraFeed) cameraFeed.srcObject = stream;

        } catch (err) {
            let message = 'Error accessing camera. ';
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                message += "Permission denied. Please check browser/OS camera permissions.";
                if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                    message += " Also, ensure site is served over HTTPS.";
                }
            } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                message += "No camera found.";
            } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
                message += "Camera is already in use or cannot start.";
                 if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                    message += " Also, ensure site is served over HTTPS.";
                }
            } else if (err.name === "OverconstrainedError" || err.name === "ConstraintNotSatisfiedError") {
                message += `Camera doesn't support requested settings. (${err.constraint || ''})`;
            } else if (err.name === "TypeError") {
                 message += "Invalid camera constraints or setup.";
            } else {
                message += `(${err.name || 'UnknownError'}: ${err.message || 'No details'}).`;
            }
            displayMessage(aiResponseAreaWrapper, message, false);
            if (cameraModal) cameraModal.classList.add('hidden');
        }
    }
    function stopCamera() { 
        if (stream) { stream.getTracks().forEach(track => track.stop()); stream = null; }
        if (cameraFeed) cameraFeed.srcObject = null;
    }

    if (mobileScanButton && cameraModal) {
        mobileScanButton.addEventListener('click', (event) => {
            event.stopPropagation(); 
            cameraModal.classList.remove('hidden'); 
            startCamera(); 
        });
    }
    if (closeCameraModalButton && cameraModal) {
        closeCameraModalButton.addEventListener('click', () => { 
            cameraModal.classList.add('hidden'); 
            stopCamera(); 
        });
    }
    if (captureButton && cameraFeed && photoCanvas && formImageUpload) {
        captureButton.addEventListener('click', () => {
            if (!stream || !cameraFeed.srcObject) { displayMessage(aiResponseAreaWrapper, "Camera not active.", false); return; }
            const videoElement = cameraFeed; const canvasElement = photoCanvas; const context = canvasElement.getContext('2d');
            canvasElement.width = videoElement.videoWidth; canvasElement.height = videoElement.videoHeight;
            context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
            canvasElement.toBlob(blob => {
                if (blob) {
                    const file = new File([blob], "capture.png", { type: "image/png" });
                    const dataTransfer = new DataTransfer(); dataTransfer.items.add(file);
                    formImageUpload.files = dataTransfer.files;
                    formImageUpload.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }, 'image/png');
            if (cameraModal) cameraModal.classList.add('hidden'); stopCamera();
        });
    }

    // --- BEMIS Submission (App - using studentForm, now in inline controls) ---
    if (studentForm && submitBemisButton) { 
        studentForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            if (bemisResponseAreaWrapper) bemisResponseAreaWrapper.innerHTML = ''; 
            
            const schoolIdVal = schoolIdInput ? schoolIdInput.value.trim() : '';
            if (!schoolIdVal) {
                displayMessage(bemisResponseAreaWrapper, 'School ID is missing. Please set it in the Settings & Model tab.', false);
                return;
            }
            if (!currentStudentDataForSubmission) {
                displayMessage(bemisResponseAreaWrapper, 'No student data. Extract first.', false);
                return;
            }
            if (studentFullNameInput && studentFullNameInput.value.trim() !== '') {
                const nameParts = studentFullNameInput.value.trim().split(/\s+/);
                currentStudentDataForSubmission['student.Surname'] = nameParts[0] || '';
                currentStudentDataForSubmission['student.FirstName'] = nameParts[1] || '';
                currentStudentDataForSubmission['student.OtherName'] = nameParts.slice(2).join(' ') || '';
            }
            
            submitBemisButton.setAttribute('disabled', 'true');
            const originalButtonContent = submitBemisButton.innerHTML;
            submitBemisButton.innerHTML = `<svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;

            try {
                const response = await fetch('/api/submit-student', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ schoolId: schoolIdVal, studentData: currentStudentDataForSubmission }),
                });
                const result = await response.json();
                displayMessage(bemisResponseAreaWrapper, result.message, result.success); 
                if (!result.success && result.data) {
                     const detailsPre = document.createElement('pre');
                     detailsPre.textContent = JSON.stringify(result.data, null, 2);
                     detailsPre.classList.add('text-xs', 'bg-slate-700', 'p-2', 'rounded', 'mt-2', 'overflow-auto');
                     if (bemisResponseAreaWrapper.firstChild) bemisResponseAreaWrapper.firstChild.appendChild(detailsPre);
                }
            } catch (error) {
                displayMessage(bemisResponseAreaWrapper, `Client-side error: ${error.message}`, false); 
            } finally {
                 submitBemisButton.removeAttribute('disabled');
                 submitBemisButton.innerHTML = originalButtonContent; 
            }
        });
    }

    // --- Settings: API Key Management (App) ---
    async function fetchApiKeyCount() { 
        if (!apiKeyCountElement) return;
        try {
            const response = await fetch('/api/settings/apikeys/count'); 
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            if (result.success) apiKeyCountElement.textContent = result.count;
            else { apiKeyCountElement.textContent = 'Error'; displayMessage(settingsResponseAreaWrapper, result.message || 'Failed to fetch API key count.', false); }
        } catch (error) { apiKeyCountElement.textContent = 'Error'; displayMessage(settingsResponseAreaWrapper, `Client-side error fetching count: ${error.message}`, false); }
    }
    if (apiKeyForm && openRouterApiKeyInput && addApiKeyButton) { 
        apiKeyForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            if(settingsResponseAreaWrapper) settingsResponseAreaWrapper.innerHTML = '';
            const apiKey = openRouterApiKeyInput.value.trim();
            if (!apiKey) { displayMessage(settingsResponseAreaWrapper, 'Please enter an API key.', false); return; }
            addApiKeyButton.setAttribute('disabled', 'true'); 
            try {
                const response = await fetch('/api/settings/apikeys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey }), });
                const result = await response.json();
                displayMessage(settingsResponseAreaWrapper, result.message, result.success);
                if (result.success) { openRouterApiKeyInput.value = ''; fetchApiKeyCount(); }
            } catch (error) { displayMessage(settingsResponseAreaWrapper, `Client-side error adding key: ${error.message}`, false);
            } finally { addApiKeyButton.removeAttribute('disabled'); }
        });
    }

    // --- Settings: BEMIS Session Cookie Management (App) ---
    if (sessionCookieForm && bemisSessionCookieInput && saveSessionCookieButton) { 
        sessionCookieForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            if (sessionResponseAreaWrapper) sessionResponseAreaWrapper.innerHTML = '';
            const cookieValue = bemisSessionCookieInput.value.trim();
            if (!cookieValue) { displayMessage(sessionResponseAreaWrapper, 'Please enter BEMIS session cookie.', false); return; }
            saveSessionCookieButton.setAttribute('disabled', 'true');
            try {
                const response = await fetch('/api/settings/session-cookie', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionCookie: cookieValue }), });
                const result = await response.json();
                displayMessage(sessionResponseAreaWrapper, result.message, result.success);
                if (result.success) bemisSessionCookieInput.value = ''; 
            } catch (error) { displayMessage(sessionResponseAreaWrapper, `Client-side error saving cookie: ${error.message}`, false);
            } finally { saveSessionCookieButton.removeAttribute('disabled'); }
        });
    }

    // Initial fetch of API key count (App)
    if (typeof fetchApiKeyCount === "function") fetchApiKeyCount();
});