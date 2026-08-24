// Shared Global Script Helpers
document.addEventListener('alpine:init', () => {
  Alpine.data('appState', () => ({
    toast: { show: false, message: '' },
    
    showToast(message, duration = 3000) {
      this.toast.message = message;
      this.toast.show = true;
      setTimeout(() => {
        this.toast.show = false;
      }, duration);
    }
  }));
});