import { useState } from "react";
import { Link } from "react-router-dom";
import { User, Building, Mail, Phone, Edit3, Shield, Calendar, Plus } from "lucide-react";

const UserProfile = ({ user, userType = "employee", showUpdatePassword = true, authFetch, showNotification }) => {
  const isAdmin = userType === "admin";
  
  // Simple profile fields based on backend Employee entity
  const profileFields = [
    { key: 'name', label: 'Full Name', icon: User, value: user?.name },
    { key: 'empId', label: 'Employee ID', icon: Building, value: user?.empId },
    { key: 'email', label: 'Email Address', icon: Mail, value: user?.email },
    { key: 'role', label: 'Role', icon: Shield, value: user?.role },
    { key: 'phone', label: 'Phone Number', icon: Phone, value: user?.phone },
    { key: 'createdAt', label: 'Joining Date', icon: Calendar, value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : null }
  ];
  
  return (
    <div className="profile-content">
      <div className={isAdmin ? "admin-profile-card" : "employee-profile-card"}>
        <div className="profile-header">
          <User size={48} />
          <div>
            <h2>{user?.name || (isAdmin ? "Admin User" : "Employee")}</h2>
            <p>{user?.role || (isAdmin ? "Administrator" : "Employee")}</p>
          </div>
        </div>
        
        {isAdmin && (
          <div className="admin-actions">
            <Link 
              to="/admin/create-user"
              className="btn-create-user"
            >
              <Plus size={16} />
              Create New User
            </Link>
          </div>
        )}
        
        {showUpdatePassword && !isAdmin && (
          <div className="panel-header">
            <Link to="/employee/update-password" className="update-password-link">
              <Edit3 size={16} />
              Update Password
            </Link>
          </div>
        )}
        
        <div className="profile-details">
          {profileFields.map(field => field.value && (
            <div key={field.key} className="profile-field">
              <field.icon size={20} />
              <div>
                <label>{field.label}</label>
                <span>{field.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;