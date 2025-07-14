// Dynamic Base URL configuration for flexible deployment
const getBaseURL = () => {
    // Check if we're running in a browser environment
    if (typeof window !== 'undefined') {
        // Extract current hostname from the browser
        const hostname = window.location.hostname;
        
        // If running locally, use localhost
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:8080';
        }
        
        // For production, use the current hostname with port 8080
        const protocol = window.location.protocol;
        return `${protocol}//${hostname}:8080`;
    }
    
    // Fallback for non-browser environments
    return 'http://localhost:8080';
};

const baseURL = getBaseURL();

// Common API response handler
async function handleApiResponse(response) {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || 'Request failed');
    }
    return await response.json();
}

// Get authentication headers for API requests
function getAuthHeaders() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
}

// Export for use in other modules
export { baseURL, handleApiResponse, getAuthHeaders };
