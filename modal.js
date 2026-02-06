export function createModal(config) {
    const {
        modalId,
        formId,
        overlayId,
        dropZoneId,
        fileInputId,
        briefTextareaId,
        briefCountId,
        triggerBtnId = null, 
        closeBtnClass = 'close-btn',
        customSubmitHandler = null,
        onOpen = null,
        onClose = null
    } = config;

    const modal = document.getElementById(modalId);
    const form = document.getElementById(formId);
    const overlay = document.getElementById(overlayId);
    const dropZone = document.getElementById(dropZoneId);
    const fileInput = document.getElementById(fileInputId);
    const briefTextarea = document.getElementById(briefTextareaId);
    const briefCount = document.getElementById(briefCountId);
    const triggerBtn = triggerBtnId ? document.getElementById(triggerBtnId) : null;
    const closeBtns = modal.querySelectorAll(`.${closeBtnClass}`);

    // Validate if modal exists
    if (!modal) {
        console.error(`Error: Modal with ID '${modalId}' not found.`);
        return null;
    }

    // Function to open modal
    function openModal(data = null) {
        modal.style.display = 'block';
        overlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
    
        if (typeof onOpen === 'function') {
            onOpen(data);
        }
    
        // Populate fields if data is provided
        if (data) {
            // Example for name field
            const nameField = form.querySelector('[name="name"]');
            if (nameField) nameField.value = data.name || '';
    
            // Repeat for other fields: position, brief, linkedin_link, twitter_link, etc.
    
            // Handle TinyMCE content
            if (data.about && tinymce.get('editConsultantAbout')) {
                tinymce.get('editConsultantAbout').setContent(data.about);
            }
        }
    }
    

    // Function to close modal
    function closeModal() {
        modal.style.display = 'none';
        overlay.style.display = 'none';
        document.body.style.overflow = 'auto';

        // Reset form and other elements
        if (form) form.reset();
        if (dropZone) dropZone.innerHTML = '<p>Click here to upload or drop files here</p>';
        updateCharCount();

        if (typeof onClose === 'function') {
            onClose();
        }
    }

    // Handle form submission
    function handleSubmit(e) {
        e.preventDefault();
        if (customSubmitHandler) {
            customSubmitHandler(e);
        } else {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            console.log(data);
            closeModal();
        }
    }

    // Handle file processing
    function processFile(file) {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (dropZone) {
                    dropZone.innerHTML = ` 
                        <img src="${e.target.result}" style="max-width: 100%; max-height: 200px;">
                        <p>File selected: ${file.name}</p>
                    `;
                }
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please upload an image file');
        }
    }

    // Update character count for textarea
    function updateCharCount() {
        if (briefCount && briefTextarea) {
            briefCount.textContent = briefTextarea.value.length;
        }
    }

    // Event Listeners
    if (triggerBtn) {
        triggerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal();
        });
    }

    // Close modal on clicking close buttons
    closeBtns.forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    // Close modal on clicking overlay
    overlay?.addEventListener('click', closeModal);

    // Form submission handler
    form?.addEventListener('submit', handleSubmit);

    // Drop zone events
    if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', e => processFile(e.target.files[0]));

        dropZone.addEventListener('dragover', e => {
            e.preventDefault();
            dropZone.style.borderColor = '#1a237e';
        });

        dropZone.addEventListener('drop', e => {
            e.preventDefault();
            dropZone.style.borderColor = '#ddd';
            processFile(e.dataTransfer.files[0]);
        });
    }

    // Character count update for textarea
    briefTextarea?.addEventListener('input', updateCharCount);

    return {
        open: openModal,
        close: closeModal
      };      
}
