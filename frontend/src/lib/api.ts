const getAuthToken = () => {
    if (typeof window === 'undefined') {
        return null;
    }
    return localStorage.getItem('authToken');
};

const api = {
    async get(endpoint: string) {
        const token = getAuthToken();
        const response = await fetch(`/api/v1${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    },

    async post(endpoint: string, body: any) {
        const token = getAuthToken();
        const response = await fetch(`/api/v1${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    },
    
    async put(endpoint: string, body: any) {
        const token = getAuthToken();
        const response = await fetch(`/api/v1${endpoint}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    },

    async delete(endpoint: string) {
        const token = getAuthToken();
        const response = await fetch(`/api/v1${endpoint}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }
};

export default api;
