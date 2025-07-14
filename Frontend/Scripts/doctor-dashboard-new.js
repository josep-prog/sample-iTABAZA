import { baseURL, handleApiResponse, getAuthHeaders } from './baseURL.js';

document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.sidebar-menu .nav-link');
    const pageContents = document.querySelectorAll('.page-content');
    const doctorNameElem = document.getElementById('doctorName');
    const doctorDepartmentElem = document.getElementById('doctorDepartment');
    const doctorAvatarElem = document.getElementById('doctorAvatar');
    const appointmentGrid = document.getElementById('appointmentGrid');
    const documentsTableBody = document.getElementById('documentsTableBody');

    const doctorInfo = getCurrentDoctor();
    if (!doctorInfo) {
        logout();
    }

    doctorNameElem.textContent = doctorInfo.name;
    doctorDepartmentElem.textContent = "Department: Loading...";
    // Update avatar if needed
    refreshDashboard();

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            setActivePage(link.dataset.page);
        });
    });

    async function refreshDashboard() {
        try {
            const response = await fetch(`${baseURL}/api/dashboard/doctor/${doctorInfo.id}/dashboard`, {
                headers: getAuthHeaders(),
            });
            const data = await handleApiResponse(response);
            if (!data.success) {
                throw new Error('Failed to fetch dashboard data');
            }

            const dashboardData = data.data;
            document.getElementById('totalAppointments').textContent = dashboardData.total_appointments || 0;
            document.getElementById('totalPatients').textContent = "TBD";  // Requires additional endpoint
            document.getElementById('totalDocuments').textContent = dashboardData.total_documents || 0;
            document.getElementById('supportTickets').textContent = dashboardData.support_tickets || 0;

            populateAppointments(dashboardData);
            populateDocuments();
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    }

    function setActivePage(pageId) {
        navLinks.forEach(link => link.classList.remove('active'));
        pageContents.forEach(content => content.classList.remove('active'));

        const activeLink = [...navLinks].find(link => link.dataset.page === pageId);
        const activeContent = document.getElementById(`${pageId}-page`);

        if (activeLink && activeContent) {
            activeLink.classList.add('active');
            activeContent.classList.add('active');
            document.getElementById('pageTitle').textContent = activeLink.querySelector('span').textContent;
            document.getElementById('pageSubtitle').textContent = `Manage your ${pageId}`;
        }
    }

    async function populateAppointments(dashboardData) {
        try {
            const response = await fetch(`${baseURL}/api/dashboard/doctor/${doctorInfo.id}/appointments?limit=5`, {
                headers: getAuthHeaders(),
            });
            const data = await handleApiResponse(response);
            
            if (!data.success || !data.data || data.data.length === 0) {
                appointmentGrid.innerHTML = '<p>No appointments to show</p>';
                return;
            }

            appointmentGrid.innerHTML = '';
            
            data.data.forEach(appointment => {
                const appointmentCard = createAppointmentCard(appointment);
                appointmentGrid.appendChild(appointmentCard);
            });
        } catch (error) {
            console.error('Error fetching appointments:', error);
            appointmentGrid.innerHTML = '<p>Error loading appointments</p>';
        }
    }

    async function populateDocuments() {
        try {
            const response = await fetch(`${baseURL}/api/dashboard/doctor/${doctorInfo.id}/documents`, {
                headers: getAuthHeaders(),
            });
            const data = await handleApiResponse(response);
            if (!data.success) {
                throw new Error('Failed to fetch documents');
            }

            documentsTableBody.innerHTML = '';
            data.data.forEach(document => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${document.document_name}</td>
                    <td>${document.document_type}</td>
                    <td>${document.users.first_name} ${document.users.last_name}</td>
                    <td>${document.appointments.appointment_date}</td>
                    <td>${new Date(document.created_at).toLocaleDateString()}</td>
                    <td>
                        <button class='btn btn-secondary' onclick='viewDocument(${document.document_url})'>View</button>
                    </td>
                `;
                documentsTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error fetching documents:', error);
        }
    }

    async function submitSupportTicket() {
        // Add implementation similar to document upload
    }

    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.onclick = logout;

    function logout() {
        localStorage.removeItem('doctorToken');
        localStorage.removeItem('doctorInfo');
        sessionStorage.removeItem('doctorToken');
        sessionStorage.removeItem('doctorInfo');
        window.location.href = './doctor.login.html';
    }

    function getCurrentDoctor() {
        const doctorInfo = localStorage.getItem('doctorInfo');
        return doctorInfo ? JSON.parse(doctorInfo) : null;
    }

    function getAuthHeaders() {
        const token = localStorage.getItem('doctorToken');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    async function handleApiResponse(response) {
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Unknown error occurred');
        }
        return data;
    }

    function createAppointmentCard(appointment) {
        const card = document.createElement('div');
        card.className = `appointment-card ${appointment.consultation_type === 'video-call' ? 'virtual' : 'in-person'}`;
        
        const statusBadge = getStatusBadge(appointment.status);
        const typeBadge = getTypeBadge(appointment.consultation_type);
        
        card.innerHTML = `
            <div class="appointment-header">
                <h3 class="appointment-patient">${appointment.patient_first_name}</h3>
                <div class="appointment-time">${appointment.appointment_date} ${appointment.appointment_time || ''}</div>
            </div>
            <div class="appointment-details">
                <div class="appointment-detail">
                    <i class="fas fa-user"></i>
                    <span>Age: ${appointment.age_of_patient}</span>
                </div>
                <div class="appointment-detail">
                    <i class="fas fa-venus-mars"></i>
                    <span>${appointment.gender}</span>
                </div>
                <div class="appointment-detail">
                    <i class="fas fa-phone"></i>
                    <span>${appointment.patient_phone || 'N/A'}</span>
                </div>
                <div class="appointment-detail">
                    <i class="fas fa-envelope"></i>
                    <span>${appointment.patient_email || 'N/A'}</span>
                </div>
            </div>
            <div class="appointment-badges">
                ${statusBadge}
                ${typeBadge}
            </div>
            <div class="appointment-description">
                <h4>Problem Description:</h4>
                <p class="description-text">${appointment.problem_description.substring(0, 100)}...</p>
                <div class="expandable-content">
                    <p><strong>Full Description:</strong> ${appointment.problem_description}</p>
                    ${appointment.symptoms ? `<p><strong>Symptoms:</strong> ${appointment.symptoms.join(', ')}</p>` : ''}
                    ${appointment.medical_history ? `<p><strong>Medical History:</strong> ${appointment.medical_history}</p>` : ''}
                    ${appointment.medications ? `<p><strong>Medications:</strong> ${appointment.medications}</p>` : ''}
                    ${appointment.address ? `<p><strong>Address:</strong> ${appointment.address}</p>` : ''}
                </div>
            </div>
            <div class="appointment-actions">
                <button class="expand-btn" onclick="toggleExpand(this)">Show More</button>
                <button class="btn btn-primary" onclick="updateAppointmentStatus('${appointment.id}', 'confirmed')">Confirm</button>
                <button class="btn btn-success" onclick="updateAppointmentStatus('${appointment.id}', 'completed')">Complete</button>
            </div>
        `;
        
        return card;
    }

    function getStatusBadge(status) {
        const badges = {
            'pending': '<span class="badge status-pending">Pending</span>',
            'confirmed': '<span class="badge status-confirmed">Confirmed</span>',
            'completed': '<span class="badge status-completed">Completed</span>',
            'cancelled': '<span class="badge status-cancelled">Cancelled</span>'
        };
        return badges[status] || '<span class="badge">Unknown</span>';
    }

    function getTypeBadge(type) {
        const badges = {
            'video-call': '<span class="badge type-virtual">Virtual</span>',
            'in-person': '<span class="badge type-in-person">In-Person</span>'
        };
        return badges[type] || '<span class="badge">Unknown</span>';
    }

    // Make functions available globally
    window.toggleExpand = function(button) {
        const card = button.closest('.appointment-card');
        const expandableContent = card.querySelector('.expandable-content');
        
        if (expandableContent.classList.contains('expanded')) {
            expandableContent.classList.remove('expanded');
            button.textContent = 'Show More';
        } else {
            expandableContent.classList.add('expanded');
            button.textContent = 'Show Less';
        }
    };

    window.updateAppointmentStatus = async function(appointmentId, status) {
        try {
            const response = await fetch(`${baseURL}/api/dashboard/appointment/${appointmentId}/status`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ status })
            });
            
            const data = await handleApiResponse(response);
            if (data.success) {
                swal('Success', `Appointment ${status} successfully`, 'success');
                refreshDashboard();
            }
        } catch (error) {
            console.error('Error updating appointment status:', error);
            swal('Error', 'Failed to update appointment status', 'error');
        }
    };
});
