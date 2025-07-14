import { baseURL, handleApiResponse, getAuthHeaders } from './baseURL.js';

// Doctor-specific authentication functions
function getDoctorAuthHeaders() {
    const token = localStorage.getItem('doctorToken') || sessionStorage.getItem('doctorToken');
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
}

function getCurrentDoctorFromStorage() {
    const doctorInfo = localStorage.getItem('doctorInfo') || sessionStorage.getItem('doctorInfo');
    return doctorInfo ? JSON.parse(doctorInfo) : null;
}

// Debounce function to prevent rapid API calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Global state to prevent multiple simultaneous requests
let isLoadingAppointments = false;
let isLoadingPatients = false;

// Fetch and populate appointments with stability fixes
async function loadAppointments(doctorId) {
    // Prevent multiple simultaneous requests
    if (isLoadingAppointments) {
        console.log('Already loading appointments, skipping...');
        return;
    }

    try {
        isLoadingAppointments = true;
        showAppointmentsLoading();
        console.log('Loading appointments for doctor:', doctorId);
        
        const response = await fetch(`${baseURL}/appointment/doctor/${doctorId}`, {
            method: 'GET',
            headers: getDoctorAuthHeaders()
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('API response:', result);
        
        if (result.success && result.data && result.data.length > 0) {
            renderAppointments(result.data, result.stats);
        } else {
            showNoAppointmentsFound();
            updateStatsToZero();
        }
    } catch (error) {
        console.error('Failed to load appointments:', error);
        showAlert('Failed to load appointments: ' + error.message, 'error');
        showNoAppointmentsFound();
        updateStatsToZero();
    } finally {
        isLoadingAppointments = false;
    }
}

// Debounced version of loadAppointments
const debouncedLoadAppointments = debounce(loadAppointments, 300);

function showAppointmentsLoading() {
    const loadingElement = document.getElementById('appointmentsLoading');
    const tableElement = document.getElementById('appointmentsTable');
    const noDataElement = document.getElementById('noAppointments');
    
    if (loadingElement) loadingElement.style.display = 'flex';
    if (tableElement) tableElement.style.display = 'none';
    if (noDataElement) noDataElement.style.display = 'none';
}

function renderAppointments(appointments, stats = null) {
    const tableBody = document.getElementById('appointmentsTableBody');
    
    if (!tableBody) {
        console.error('Appointments table body not found');
        return;
    }
    
    // Clear existing rows efficiently
    tableBody.innerHTML = '';
    
    // Calculate stats if not provided
    const calculatedStats = stats || {
        total: appointments.length,
        pending: appointments.filter(app => app.status === 'pending').length,
        confirmed: appointments.filter(app => app.status === 'confirmed').length,
        completed: appointments.filter(app => app.status === 'completed').length,
        cancelled: appointments.filter(app => app.status === 'cancelled').length,
        today: appointments.filter(app => {
            const today = new Date().toISOString().split('T')[0];
            return app.appointment_date === today;
        }).length
    };

    // Create document fragment for efficient DOM manipulation
    const fragment = document.createDocumentFragment();

    appointments.forEach(appointment => {
        const row = document.createElement('tr');
        const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString();
        const paymentStatus = appointment.payment_status ? 'Paid' : 'Unpaid';
        const paymentClass = appointment.payment_status ? 'text-success' : 'text-warning';
        
        // Truncate problem description to prevent layout shifts
        const problemDesc = (appointment.problem_description || '').substring(0, 40);
        const truncatedDesc = appointment.problem_description && appointment.problem_description.length > 40 
            ? problemDesc + '...' 
            : problemDesc;
        
        row.innerHTML = `
            <td>${appointmentDate}</td>
            <td>${appointment.slot_time || appointment.appointment_time || 'N/A'}</td>
            <td>${appointment.patient_first_name || 'N/A'}</td>
            <td title="${appointment.problem_description || ''}">${truncatedDesc}</td>
            <td><span class="status-badge status-${appointment.status}">${appointment.status}</span></td>
            <td><span class="${paymentClass}">${paymentStatus}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="viewAppointment('${appointment.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-success" onclick="completeAppointment('${appointment.id}')" title="Mark Complete">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="rescheduleAppointment('${appointment.id}')" title="Reschedule">
                        <i class="fas fa-calendar-alt"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="cancelAppointment('${appointment.id}')" title="Cancel">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </td>
        `;
        fragment.appendChild(row);
    });

    // Append all rows at once
    tableBody.appendChild(fragment);

    updateStats(calculatedStats);
    document.getElementById('appointmentsLoading').style.display = 'none';
    document.getElementById('appointmentsTable').style.display = 'block';
}

function showNoAppointmentsFound() {
    const loadingElement = document.getElementById('appointmentsLoading');
    const tableElement = document.getElementById('appointmentsTable');
    const noDataElement = document.getElementById('noAppointments');
    
    if (loadingElement) loadingElement.style.display = 'none';
    if (tableElement) tableElement.style.display = 'none';
    if (noDataElement) noDataElement.style.display = 'block';
}

// Update dashboard statistics with stability
function updateStats(stats) {
    // Batch DOM updates to prevent layout thrashing
    requestAnimationFrame(() => {
        const elements = {
            totalAppointments: document.getElementById('totalAppointments'),
            todayAppointments: document.getElementById('todayAppointments'),
            pendingAppointments: document.getElementById('pendingAppointments'),
            completedAppointments: document.getElementById('completedAppointments')
        };

        if (elements.totalAppointments) elements.totalAppointments.textContent = stats.total || 0;
        if (elements.todayAppointments) elements.todayAppointments.textContent = stats.today || 0;
        if (elements.pendingAppointments) elements.pendingAppointments.textContent = stats.pending || 0;
        if (elements.completedAppointments) elements.completedAppointments.textContent = stats.completed || 0;
    });
}

function updateStatsToZero() {
    updateStats({ total: 0, today: 0, pending: 0, completed: 0 });
}

function showAlert(message, type) {
    const alertMessage = document.getElementById('alertMessage');
    if (!alertMessage) return;

    alertMessage.textContent = message;
    alertMessage.className = `alert ${type}`;
    alertMessage.style.display = 'block';

    // Auto-hide alert after 5 seconds
    setTimeout(() => {
        alertMessage.style.display = 'none';
    }, 5000);
}

// Global functions for appointment actions
window.viewAppointment = function(appointmentId) {
    console.log('Viewing appointment:', appointmentId);
    showAlert(`Viewing appointment details for ${appointmentId}`, 'info');
};

window.completeAppointment = async function(appointmentId) {
    try {
        const response = await fetch(`${baseURL}/appointment/approve/${appointmentId}`, {
            method: 'PATCH',
            headers: getDoctorAuthHeaders()
        });
        
        if (response.ok) {
            showAlert('Appointment marked as completed!', 'success');
            const doctorInfo = getCurrentDoctorFromStorage();
            if (doctorInfo) {
                debouncedLoadAppointments(doctorInfo.id);
            }
        } else {
            throw new Error('Failed to update appointment');
        }
    } catch (error) {
        console.error('Error completing appointment:', error);
        showAlert('Failed to complete appointment', 'error');
    }
};

window.rescheduleAppointment = function(appointmentId) {
    console.log('Rescheduling appointment:', appointmentId);
    showAlert(`Rescheduling appointment ${appointmentId}`, 'warning');
};

window.cancelAppointment = async function(appointmentId) {
    if (confirm('Are you sure you want to cancel this appointment?')) {
        try {
            const response = await fetch(`${baseURL}/appointment/reject/${appointmentId}`, {
                method: 'DELETE',
                headers: getDoctorAuthHeaders()
            });
            
            if (response.ok) {
                showAlert('Appointment cancelled successfully!', 'success');
                const doctorInfo = getCurrentDoctorFromStorage();
                if (doctorInfo) {
                    debouncedLoadAppointments(doctorInfo.id);
                }
            } else {
                throw new Error('Failed to cancel appointment');
            }
        } catch (error) {
            console.error('Error cancelling appointment:', error);
            showAlert('Failed to cancel appointment', 'error');
        }
    }
};

// Global refresh function
window.refreshAppointments = function() {
    const doctorInfo = getCurrentDoctorFromStorage();
    if (doctorInfo) {
        debouncedLoadAppointments(doctorInfo.id);
    }
};

window.refreshPatients = function() {
    loadPatientsList();
};

// Load patients for the documents page
async function loadPatientsList() {
    if (isLoadingPatients) return;
    
    try {
        isLoadingPatients = true;
        const response = await fetch(`${baseURL}/user/get-all-users`, {
            headers: getDoctorAuthHeaders()
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                renderPatientsList(result.data);
            }
        }
    } catch (error) {
        console.error('Error loading patients:', error);
    } finally {
        isLoadingPatients = false;
    }
}

function renderPatientsList(patients) {
    const patientsList = document.getElementById('patientsList');
    if (!patientsList) return;

    // Clear existing patients
    patientsList.innerHTML = '';

    // Create document fragment for efficient DOM manipulation
    const fragment = document.createDocumentFragment();

    patients.forEach(patient => {
        const patientItem = document.createElement('div');
        patientItem.className = 'patient-item';
        patientItem.dataset.patientId = patient.id;
        patientItem.innerHTML = `
            <div class="patient-name">${patient.first_name} ${patient.last_name}</div>
            <div class="patient-email">${patient.email}</div>
        `;

        // Add click event with debouncing
        patientItem.addEventListener('click', debounce(function() {
            // Remove selection from all items
            document.querySelectorAll('.patient-item').forEach(i => i.classList.remove('selected'));
            
            // Add selection to clicked item
            this.classList.add('selected');
            
            // Update form fields
            const patientName = `${patient.first_name} ${patient.last_name}`;
            const patientId = patient.id;
            
            const selectedPatientInput = document.getElementById('selectedPatient');
            const patientIdInput = document.getElementById('patientId');
            
            if (selectedPatientInput) selectedPatientInput.value = patientName;
            if (patientIdInput) patientIdInput.value = patientId;
        }, 200));

        fragment.appendChild(patientItem);
    });

    patientsList.appendChild(fragment);
}

// Document upload functionality
function initializeDocumentUpload() {
    const uploadForm = document.getElementById('uploadForm');
    const documentFileInput = document.getElementById('documentFile');
    const fileDisplay = document.getElementById('fileDisplay');

    if (!uploadForm || !documentFileInput || !fileDisplay) return;

    // File input handling with debouncing
    documentFileInput.addEventListener('change', debounce(function(e) {
        const file = e.target.files[0];
        if (file) {
            fileDisplay.classList.add('has-file');
            fileDisplay.innerHTML = `
                <i class="fas fa-file-alt"></i>
                <p><strong>${file.name}</strong></p>
                <small>Size: ${formatFileSize(file.size)}</small>
            `;
        } else {
            fileDisplay.classList.remove('has-file');
            fileDisplay.innerHTML = `
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Click to select file or drag and drop</p>
                <small>Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 5MB)</small>
            `;
        }
    }, 100));

    // Form submission
    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const doctorInfo = getCurrentDoctorFromStorage();
        if (!doctorInfo) {
            showAlert('Doctor information not found. Please login again.', 'error');
            return;
        }

        const uploadBtn = document.getElementById('uploadBtn');
        const formData = new FormData(uploadForm);

        try {
            if (uploadBtn) {
                uploadBtn.disabled = true;
                uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
            }

            // Simulate upload for demo (replace with actual API call)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            showAlert('Document uploaded successfully!', 'success');
            uploadForm.reset();
            
            // Reset file display
            fileDisplay.classList.remove('has-file');
            fileDisplay.innerHTML = `
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Click to select file or drag and drop</p>
                <small>Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 5MB)</small>
            `;
            
            // Clear patient selection
            document.querySelectorAll('.patient-item').forEach(i => i.classList.remove('selected'));
            const selectedPatientInput = document.getElementById('selectedPatient');
            const patientIdInput = document.getElementById('patientId');
            if (selectedPatientInput) selectedPatientInput.value = '';
            if (patientIdInput) patientIdInput.value = '';
            
        } catch (error) {
            console.error('Upload error:', error);
            showAlert('Upload failed: ' + error.message, 'error');
        } finally {
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Document';
            }
        }
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Initialize current date display
function initializeCurrentDate() {
    const currentDateElement = document.getElementById('currentDate');
    if (!currentDateElement) return;

    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    currentDateElement.textContent = now.toLocaleDateString(undefined, options);
}

// Load doctor profile information
function loadDoctorProfile() {
    const doctorInfo = getCurrentDoctorFromStorage();
    if (!doctorInfo) return;

    // Update sidebar information
    const doctorNameElement = document.getElementById('doctorName');
    const doctorSpecialtyElement = document.getElementById('doctorSpecialty');
    
    if (doctorNameElement) {
        doctorNameElement.textContent = doctorInfo.doctor_name || doctorInfo.name || 'Dr. Unknown';
    }
    if (doctorSpecialtyElement) {
        doctorSpecialtyElement.textContent = doctorInfo.qualifications || 'Medical Doctor';
    }
    
    // Update profile form if on profile page
    const profileElements = {
        profileName: document.getElementById('profileName'),
        profileEmail: document.getElementById('profileEmail'),
        profilePhone: document.getElementById('profilePhone'),
        profileSpecialty: document.getElementById('profileSpecialty'),
        profileQualifications: document.getElementById('profileQualifications'),
        profileExperience: document.getElementById('profileExperience'),
        profileCity: document.getElementById('profileCity')
    };

    if (profileElements.profileName) {
        profileElements.profileName.value = doctorInfo.doctor_name || doctorInfo.name || '';
    }
    if (profileElements.profileEmail) {
        profileElements.profileEmail.value = doctorInfo.email || '';
    }
    if (profileElements.profilePhone) {
        profileElements.profilePhone.value = doctorInfo.phone_no || '';
    }
    if (profileElements.profileSpecialty) {
        profileElements.profileSpecialty.value = doctorInfo.qualifications || '';
    }
    if (profileElements.profileQualifications) {
        profileElements.profileQualifications.value = doctorInfo.qualifications || '';
    }
    if (profileElements.profileExperience) {
        profileElements.profileExperience.value = doctorInfo.experience || '';
    }
    if (profileElements.profileCity) {
        profileElements.profileCity.value = doctorInfo.city || '';
    }
}

// Global logout function
window.logout = function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('doctorToken');
        localStorage.removeItem('doctorInfo');
        sessionStorage.removeItem('doctorToken');
        sessionStorage.removeItem('doctorInfo');
        window.location.href = './doctor.login.html';
    }
};

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize current date
    initializeCurrentDate();
    
    // Load doctor profile
    loadDoctorProfile();
    
    // Load initial data
    const doctorInfo = getCurrentDoctorFromStorage();
    if (doctorInfo && doctorInfo.id) {
        debouncedLoadAppointments(doctorInfo.id);
        loadPatientsList();
    } else {
        showAlert('Doctor information not found. Please login again.', 'error');
        setTimeout(() => {
            window.location.href = './doctor.login.html';
        }, 3000);
        return;
    }

    // Initialize document upload functionality
    initializeDocumentUpload();

    // Navigation functionality with debouncing
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
    const pageSections = document.querySelectorAll('.page-section');

    sidebarLinks.forEach(link => {
        link.addEventListener('click', debounce(function(e) {
            e.preventDefault();
            
            // Remove active class from all links
            sidebarLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            // Hide all page sections
            pageSections.forEach(section => section.classList.remove('active'));
            
            // Show selected page section
            const page = this.dataset.page;
            const targetSection = document.getElementById(page + '-page');
            if (targetSection) {
                targetSection.classList.add('active');
            }

            // Update page title
            const pageTitle = document.getElementById('pageTitle');
            if (pageTitle) {
                pageTitle.textContent = this.querySelector('span').textContent;
            }
            
            // Load page-specific data
            if (page === 'appointments') {
                debouncedLoadAppointments(doctorInfo.id);
            } else if (page === 'documents') {
                loadPatientsList();
            }
        }, 200));
    });

    // Appointment filter functionality
    const appointmentFilter = document.getElementById('appointmentFilter');
    if (appointmentFilter) {
        appointmentFilter.addEventListener('change', debounce(function() {
            const filterValue = this.value;
            const rows = document.querySelectorAll('#appointmentsTableBody tr');
            
            rows.forEach(row => {
                if (filterValue === 'all') {
                    row.style.display = '';
                } else {
                    const statusCell = row.querySelector('.status-badge');
                    if (statusCell && statusCell.textContent.toLowerCase() === filterValue) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                }
            });
        }, 200));
    }
});
