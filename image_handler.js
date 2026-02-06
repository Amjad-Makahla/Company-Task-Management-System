/**
 * @fileoverview Handles all image-related operations including upload, preview, validation, and processing
 */

// Import required utilities
import { showUserMessage } from './config.js';

/**
 * Configuration options for image validation
 * @type {Object}
 */
const defaultValidationOptions = {
    maxSizeMB: 2,
    allowedTypes: ['image/jpeg', 'image/png'],
};

/**
 * Validates an image file based on size and type.
 * @param {File} file - The image file to validate.
 * @param {Object} options - Validation options.
 * @param {number} options.maxSizeMB - Maximum file size in MB.
 * @param {string[]} options.allowedTypes - Allowed MIME types.
 * @returns {Object} Validation result with success and message.
 */


function validateImage(file, { maxSizeMB, allowedTypes }) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024; // Convert MB to bytes
    const fileSize = file.size;

    if (fileSize > maxSizeBytes) {
        return { success: false, message: 'File is too large. Maximum size allowed is ' + maxSizeMB + 'MB.' };
    }

    const fileType = file.type;
    if (!allowedTypes.includes(fileType)) {
        return { success: false, message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` };
    }

    return { success: true };
}

/**
 * Helper function to convert an image file to Base64 format.
 * @param {File} file - The file to convert.
 * @returns {Promise<string>} - A promise that resolves with the Base64 string.
 */
async function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]); // Get only the Base64 part
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Handles image upload, validates it, and processes it.
 * @param {Event} event - The input change event.
 */
async function handleImageUpload(event) {
    // isImageChanged = true;
    const file = event.target.files[0]; // Get the uploaded file

    if (!file) {
        showUserMessage("No file selected.", "error");
        return null;
    }

    // Validate the image
    const validation = validateImage(file, { maxSizeMB: 5, allowedTypes: ['image/jpeg', 'image/png', 'image/gif'] });

    if (!validation.success) {
        showUserMessage(validation.message, "error");
        event.target.value = ""; // Clear the file input
        return null; // Return null in case of validation failure
    }

    try {
        // Convert to Base64 and return it
        const imageBase64 = await toBase64(file);
        return imageBase64; // Return the base64 string
    } catch (error) {
        showUserMessage("Failed to process the image. Please try again.", "error");
        event.target.value = ""; // Clear the file input
        return null;
    }
}

/**
 * Helper function to get a Base64 string of an image file from its path.
 * (This is a PHP function for server-side processing.)
 * @param {string} $imagePath - The path to the fimage file.
 * @returns {string} - Base64-encoded string.
 */
function getBase64Image($imagePath) {
    const $imageData = file_get_contents($imagePath);
    return base64_encode($imageData);
}

/**
 * Initializes an image upload handler with preview functionality
 * @param {Object} options - Configuration options
 * @param {string} options.dropZoneId - ID of the drop zone element
 * @param {string} options.fileInputId - ID of the file input element
 * @param {string} [options.defaultImageSrc='assets/img/icons/upload_image.svg'] - Default image source
 * @param {string} [options.defaultText='Click here to upload or drop files here'] - Default upload text
 * @param {string} [options.maxHeight='200px'] - Maximum height for preview image
 * @returns {Object} Public methods for controlling the upload handler
 */
function initializeImageHandler(options = {}) {
    const {
        dropZoneId,
        fileInputId,
        defaultImageSrc = 'assets/img/icons/upload_image.svg',
        defaultText = 'Click here to upload or drop files here',
        maxHeight = '200px'
    } = options;

    // DOM elements
    const dropZone = document.getElementById(dropZoneId);
    const fileInput = document.getElementById(fileInputId);
    let imageBase64 = '';

    // Validate required elements
    if (!dropZone || !fileInput) {
        console.error('Required elements not found');
        return null;
    }

    /**
     * Sets up all event listeners for the upload functionality
     * @private
     */
    function initializeEventListeners() {
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragleave', handleDragLeave);
        dropZone.addEventListener('drop', handleDrop);
        fileInput.addEventListener('change', handleFileInputChange);
    }

    /**
     * Handles dragover event
     * @private
     * @param {DragEvent} e - The drag event
     */
    function handleDragOver(e) {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--color-secondary)';
    }

    /**
     * Handles dragleave event
     * @private
     * @param {DragEvent} e - The drag event
     */
    function handleDragLeave(e) {
        e.preventDefault();
        dropZone.style.borderColor = '#E5E7EB';
    }

    /**
     * Handles drop event
     * @private
     * @param {DragEvent} e - The drop event
     */
    function handleDrop(e) {
        e.preventDefault();
        dropZone.style.borderColor = '#E5E7EB';

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processFile(files[0]);
        }
    }

    /**
     * Handles file input change event
     * @private
     * @param {Event} e - The change event
     */
    function handleFileInputChange(e) {
        if (e.target.files.length > 0) {
            processFile(e.target.files[0]);
        }
    }
    /**
       * Processes and validates the selected file
       * @private
       * @param {File} file - The file to process
       */
    function processFile(file) {
        // Validate file type
        const validation = validateImage(file, defaultValidationOptions);
        if (!validation.success) {
            showUserMessage(validation.message, 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            imageBase64 = e.target.result;
            updatePreview(e.target.result);
        };
        reader.onerror = () => {
            showUserMessage('Failed to read the image file.', 'error');
        };
        reader.readAsDataURL(file);
    }

    /**
     * Updates the preview area with the selected image
     * @private
     * @param {string} imageSrc - The image source (base64 or URL)
     */
    function updatePreview(imageSrc) {
        dropZone.innerHTML = `
        <img src="${imageSrc}" 
            alt="Selected Image" 
            class="img-fluid" 
            style="max-height: ${maxHeight}; width: auto; display: block;">
        <p class="mb-0 mt-2">Image selected</p>
        <button type="button" class="btn btn-link text-danger mt-2">Remove</button>
    `;

        const removeBtn = dropZone.querySelector('.btn-link');
        removeBtn.addEventListener('click', resetUploadArea);
    }

    /**
     * Resets the upload area to its initial state
     * @private
     */
    function resetUploadArea() {
        imageBase64 = '';
        fileInput.value = '';
        dropZone.innerHTML = `
        <img src="${defaultImageSrc}" 
            alt="Upload Image" 
            class="img-fluid bg-gray mb-3">
        <p class="mb-0"><span style="color: var(--color-secondary);">Click here</span> to ${defaultText}</p>
    `;
    }

    /**
     * Gets the current image as base64 string
     * @public
     * @returns {string} The base64 string of the current image
     */
    function getImageBase64() {
        return imageBase64;
    }

    // Initialize the handlers
    initializeEventListeners();

    // Return public API
return {
    reset: resetUploadArea,
    getImageBase64,

    // ✅ ADD THIS FUNCTION TO FIX THE ISSUE
    setImage: function (imageSrc) {
        imageBase64 = ''; // This will be empty since it's a pre-loaded image, not new upload
        dropZone.innerHTML = `
            <img src="${imageSrc}" 
                alt="Selected Image" 
                class="img-fluid" 
                style="max-height: ${maxHeight}; width: auto; display: block;">
            <p class="mb-0 mt-2">Existing Image</p>
            <button type="button" class="btn btn-link text-danger mt-2">Remove</button>
        `;

        const removeBtn = dropZone.querySelector('.btn-link');
        removeBtn.addEventListener('click', resetUploadArea);
    }
};

}

// Export functions
export {
    initializeImageHandler,
    handleImageUpload
};
