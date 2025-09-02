import { Navigate } from 'react-router-dom';

// Basitleştirilmiş PrivateRoute - App.js'deki user state'ine güvenir
const PrivateRoute = ({ children, user }) => {
  // user prop'u yoksa login'e yönlendir
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // user varsa children'ı render et
  return children;
};

export default PrivateRoute;