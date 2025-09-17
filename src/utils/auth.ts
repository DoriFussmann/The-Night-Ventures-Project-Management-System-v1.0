// Authentication utilities

export const logout = async (): Promise<void> => {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Logout failed:', response.statusText);
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Always redirect to login, even if logout API fails
    window.location.href = '/login';
  }
};

export const handleLogout = () => {
  if (confirm('Are you sure you want to log out?')) {
    logout();
  }
};
