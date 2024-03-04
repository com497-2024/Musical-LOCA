// Function to handle user sign in
async function signIn() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('login.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                alert('User signed in successfully!');
                window.location.href = 'homepage.html';
            } else {
                alert(data.message);
            }
        } else {
            throw new Error('Error signing in');
        }
    } catch (error) {
        console.error('Error signing in:', error);
        alert('Error signing in: ' + error.message);
    }
}

// Function to handle forgot password
function forgotPassword() {
    alert('Forgot password feature coming soon!');
}

async function forgotPassword() {
    const username = document.getElementById('username').value;

    try {
        // Implement forgot password functionality here
        alert('Forgot password functionality not implemented yet.');
    } catch (error) {
        console.error('Error initiating forgot password flow:', error);
        alert('Error initiating forgot password flow: ' + error.message);
    }
}
