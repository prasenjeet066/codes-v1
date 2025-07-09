import React, { createContext, useContext, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Info, CheckCircle, X } from 'lucide-react';

// Dialog Context
const DialogContext = createContext();

// Dialog Provider Component
export function DialogProvider({ children }) {
  const [dialogs, setDialogs] = useState([]);

  const openDialog = useCallback((component, props = {}) => {
    const id = Date.now() + Math.random();
    setDialogs(prev => [...prev, { id, component, props }]);
    return id;
  }, []);

  const closeDialog = useCallback((id) => {
    setDialogs(prev => prev.filter(dialog => dialog.id !== id));
  }, []);

  const closeAllDialogs = useCallback(() => {
    setDialogs([]);
  }, []);

  return (
    <DialogContext.Provider value={{ openDialog, closeDialog, closeAllDialogs }}>
      {children}
      {dialogs.map(({ id, component: Component, props }) => (
        <Dialog key={id} open={true} onOpenChange={() => closeDialog(id)}>
          <DialogContent className="sm:max-w-md">
            <Component {...props} onClose={() => closeDialog(id)} dialogId={id} />
          </DialogContent>
        </Dialog>
      ))}
    </DialogContext.Provider>
  );
}

// Custom hook to use dialog
export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}

// Pre-built Dialog Components
function ConfirmDialog({ title, message, onConfirm, onCancel, onClose, variant = 'default' }) {
  const getIcon = () => {
    switch (variant) {
      case 'destructive':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {getIcon()}
          {title}
        </DialogTitle>
        <DialogDescription>{message}</DialogDescription>
      </DialogHeader>
      <div className="flex gap-2 justify-end mt-4">
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button 
          variant={variant === 'destructive' ? 'destructive' : 'default'}
          onClick={handleConfirm}
        >
          Confirm
        </Button>
      </div>
    </>
  );
}

function FormDialog({ title, fields, onSubmit, onClose }) {
  const [formData, setFormData] = useState(
    fields.reduce((acc, field) => ({ ...acc, [field.name]: field.defaultValue || '' }), {})
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit(formData);
    onClose();
  };

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        {fields.map(field => (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>{field.label}</Label>
            <Input
              id={field.name}
              type={field.type || 'text'}
              placeholder={field.placeholder}
              value={formData[field.name]}
              onChange={(e) => handleChange(field.name, e.target.value)}
              required={field.required}
            />
          </div>
        ))}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Submit</Button>
        </div>
      </form>
    </>
  );
}

function InfoDialog({ title, message, onClose }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-500" />
          {title}
        </DialogTitle>
        <DialogDescription>{message}</DialogDescription>
      </DialogHeader>
      <div className="flex justify-end mt-4">
        <Button onClick={onClose}>Got it</Button>
      </div>
    </>
  );
}

function CustomContentDialog({ title, children, onClose }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-4 top-4"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </DialogHeader>
      <div className="mt-4">
        {children}
      </div>
    </>
  );
}

// Main Demo Component
function DialogDemo() {
  const { openDialog, closeAllDialogs } = useDialog();
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message) => {
    setNotifications(prev => [...prev, { id: Date.now(), message }]);
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 3000);
  };

  const handleConfirmAction = () => {
    openDialog(ConfirmDialog, {
      title: 'Delete Item',
      message: 'Are you sure you want to delete this item? This action cannot be undone.',
      variant: 'destructive',
      onConfirm: () => addNotification('Item deleted successfully!'),
      onCancel: () => addNotification('Delete cancelled')
    });
  };

  const handleSuccessAction = () => {
    openDialog(ConfirmDialog, {
      title: 'Save Changes',
      message: 'Do you want to save your changes?',
      variant: 'success',
      onConfirm: () => addNotification('Changes saved!'),
      onCancel: () => addNotification('Changes discarded')
    });
  };

  const handleFormAction = () => {
    openDialog(FormDialog, {
      title: 'Add New User',
      fields: [
        { name: 'name', label: 'Name', placeholder: 'Enter name', required: true },
        { name: 'email', label: 'Email', type: 'email', placeholder: 'Enter email', required: true },
        { name: 'role', label: 'Role', placeholder: 'Enter role', defaultValue: 'User' }
      ],
      onSubmit: (data) => {
        addNotification(`User ${data.name} added successfully!`);
        console.log('Form submitted:', data);
      }
    });
  };

  const handleInfoAction = () => {
    openDialog(InfoDialog, {
      title: 'System Information',
      message: 'Your system is running smoothly. All services are operational and up to date.'
    });
  };

  const handleCustomAction = () => {
    openDialog(CustomContentDialog, {
      title: 'Custom Dialog',
      children: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This is a custom dialog with any content you want!
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm">Option 1</Button>
            <Button variant="outline" size="sm">Option 2</Button>
            <Button variant="outline" size="sm">Option 3</Button>
            <Button variant="outline" size="sm">Option 4</Button>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">
              You can put any React components here: forms, lists, images, etc.
            </p>
          </div>
        </div>
      )
    });
  };

  const handleMultipleDialogs = () => {
    // Open multiple dialogs in sequence
    openDialog(InfoDialog, {
      title: 'Step 1',
      message: 'This is the first dialog. Close it to continue.'
    });
    
    setTimeout(() => {
      openDialog(ConfirmDialog, {
        title: 'Step 2',
        message: 'This is the second dialog. Multiple dialogs can be open simultaneously.',
        onConfirm: () => addNotification('Multi-step process completed!')
      });
    }, 500);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Global Dialog Provider Demo</h1>
        <p className="text-gray-600">
          This demonstrates a global dialog system that can be used throughout your React application.
        </p>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 space-y-2 z-50">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg"
            >
              {notification.message}
            </div>
          ))}
        </div>
      )}

      {/* Dialog Triggers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Button onClick={handleConfirmAction} variant="destructive">
          Delete Dialog (Destructive)
        </Button>
        
        <Button onClick={handleSuccessAction} variant="default">
          Save Dialog (Success)
        </Button>
        
        <Button onClick={handleFormAction} variant="outline">
          Form Dialog
        </Button>
        
        <Button onClick={handleInfoAction} variant="secondary">
          Info Dialog
        </Button>
        
        <Button onClick={handleCustomAction} variant="outline">
          Custom Content Dialog
        </Button>
        
        <Button onClick={handleMultipleDialogs} variant="outline">
          Multiple Dialogs
        </Button>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2 p-4 bg-gray-50 rounded-lg">
        <Button onClick={closeAllDialogs} variant="outline" size="sm">
          Close All Dialogs
        </Button>
        <span className="text-sm text-gray-600 flex items-center">
          Global controls for all dialogs
        </span>
      </div>

      {/* Features List */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">Features:</h3>
        <ul className="text-sm space-y-1 text-gray-700">
          <li>• Global dialog state management</li>
          <li>• Multiple dialogs can be open simultaneously</li>
          <li>• Pre-built dialog components (Confirm, Form, Info, Custom)</li>
          <li>• Easy integration with any component using useDialog hook</li>
          <li>• Automatic cleanup and unique ID generation</li>
          <li>• Customizable dialog content and behavior</li>
        </ul>
      </div>
    </div>
  );
}

// Main App Component
export default function App() {
  return (
    <DialogProvider>
      <DialogDemo />
    </DialogProvider>
  );
}