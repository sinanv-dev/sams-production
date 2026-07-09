const compressImage = async (file: File): Promise<Blob | File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const MAX_SIZE = 1200;
      if (width > height) {
        if (width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        0.8
      );
    };
    img.onerror = () => {
      resolve(file);
    };
  });
};

export const uploadToCloudinary = async (
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> => {
  // 1. Validation checks
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File size must not exceed 5 MB.");
  }

  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
  const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
  if (!allowedExtensions.includes(fileExt)) {
    throw new Error(`Invalid file type. Allowed formats: ${allowedExtensions.join(', ')}`);
  }

  // 2. Client-side canvas compression for images
  let fileToUpload: File | Blob = file;
  if (file.type.startsWith('image/')) {
    try {
      fileToUpload = await compressImage(file);
    } catch (e) {
      console.warn("Cloudinary: Client-side compression failed, uploading original: ", e);
    }
  }

  // 3. XHR request to Cloudinary API
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('upload_preset', 'sams_upload');

    xhr.open('POST', 'https://api.cloudinary.com/v1_1/reyq1ypi/auto/upload', true);

    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      });
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.secure_url) {
            resolve(response.secure_url);
          } else {
            reject(new Error("Secure URL not found in Cloudinary response."));
          }
        } catch (e) {
          reject(new Error("Failed to parse Cloudinary response."));
        }
      } else {
        try {
          const errorResp = JSON.parse(xhr.responseText);
          reject(new Error(errorResp.error?.message || `Cloudinary upload failed: Status ${xhr.status}`));
        } catch (e) {
          reject(new Error(`Cloudinary upload failed: Status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during Cloudinary upload."));
    };

    xhr.send(formData);
  });
};
