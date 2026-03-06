const axios = require('axios');

async function testApi() {
    try {
        const loginRes = await axios.post('http://localhost:8080/api/auth/login', {
            username: 'admin',
            password: 'admin123'
        });
        const token = loginRes.data.token;
        console.log('Got token:', token ? 'yes' : 'no');

        try {
            const coursesRes = await axios.get('http://localhost:8080/api/lms/courses', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Courses:', JSON.stringify(coursesRes.data, null, 2));
        } catch (e) {
            console.log('Courses API Error:', e.response?.data || e.message);
        }

        try {
            const statsRes = await axios.get('http://localhost:8080/api/lms/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Stats:', JSON.stringify(statsRes.data, null, 2));
        } catch (e) {
            console.log('Stats API Error:', e.response?.data || e.message);
        }
    } catch (e) {
        console.log('Login failed', e.response?.data || e.message);
    }
}

testApi();
