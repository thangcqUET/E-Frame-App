import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ImageDataItem {
  id: string;
  name: string;
  preview: string; // Base64 or require() path for preview
  byteData: number[]; // 15000 bytes of raw data
  description?: string;
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
}

const STORAGE_KEY = '@ImageStorage:images';

// Generate a simple preview image based on image name/hash
const generatePreviewImage = (name: string, byteData: number[]): string => {
  // Simple hash-based color generation
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Use byte data to influence color if available
  if (byteData.length > 0) {
    hash += byteData[0] + byteData[Math.floor(byteData.length / 2)] + byteData[byteData.length - 1];
  }
  
  // Generate RGB values
  const r = Math.abs(hash % 256);
  const g = Math.abs((hash >> 8) % 256);
  const b = Math.abs((hash >> 16) % 256);
  
  // Create a simple SVG image with the generated color (without base64 encoding)
  const svgContent = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="rgb(${r},${g},${b})"/><text x="50" y="50" font-family="Arial" font-size="12" fill="white" text-anchor="middle" dominant-baseline="middle">${name.substring(0, 3).toUpperCase()}</text></svg>`;
  
  // Use data URI with URL encoding instead of base64
  const canvas = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
  
  return canvas;
};

// Parse hex byte string (e.g., "0x92,0x91,0xAA" or multi-line) into number array
export const parseByteString = (byteString: string): number[] => {
  if (!byteString.trim()) return [];
  
  const bytes: number[] = [];
  
  // Handle line breaks, commas, and spaces as separators
  // First replace line breaks with commas, then split by commas
  const normalizedString = byteString
    .trim()
    .replace(/[\r\n]+/g, ',')  // Replace line breaks with commas
    .replace(/\s*,\s*/g, ',')  // Normalize comma spacing
    .replace(/\s+/g, ',');     // Replace remaining spaces with commas
  
  const parts = normalizedString.split(',');
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    
    try {
      let value: number;
      if (trimmed.toLowerCase().startsWith('0x')) {
        // Hex format: 0xAB
        value = parseInt(trimmed, 16);
      } else if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length <= 2) {
        // Plain hex: AB
        value = parseInt(trimmed, 16);
      } else {
        // Decimal format: 123
        value = parseInt(trimmed, 10);
      }
      
      if (isNaN(value) || value < 0 || value > 255) {
        throw new Error(`Invalid byte value: ${trimmed}`);
      }
      
      bytes.push(value);
    } catch (error) {
      throw new Error(`Invalid byte format at "${trimmed}". Expected formats: 0xAB, AB, or decimal 0-255`);
    }
  }
  
  return bytes;
};

// Convert number array to hex string for display
export const bytesToHexString = (bytes: number[]): string => {
  return bytes.map(b => `0x${b.toString(16).padStart(2, '0').toUpperCase()}`).join(',');
};

class ImageStorageService {
  private images: ImageDataItem[] = [];
  private initialized = false;

  // Initialize the service and load existing images
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.images = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading images from storage:', error);
      this.images = [];
    }
    
    this.initialized = true;
  }

  // Save images to AsyncStorage
  private async saveToStorage(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.images));
    } catch (error) {
      console.error('Error saving images to storage:', error);
      throw new Error('Failed to save image data');
    }
  }

  // Get all images
  async getAllImages(): Promise<ImageDataItem[]> {
    await this.initialize();
    return [...this.images];
  }

  // Get image by ID
  async getImageById(id: string): Promise<ImageDataItem | null> {
    await this.initialize();
    return this.images.find(img => img.id === id) || null;
  }

  // Add new image
  async addImage(name: string, byteString: string, description?: string): Promise<ImageDataItem> {
    await this.initialize();
    
    if (!name.trim()) {
      throw new Error('Image name is required');
    }

    // Check for duplicate names
    if (this.images.some(img => img.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('An image with this name already exists');
    }

    let byteData: number[];
    try {
      byteData = parseByteString(byteString);
    } catch (error) {
      throw new Error(`Invalid byte data: ${(error as Error).message}`);
    }

    if (byteData.length === 0) {
      throw new Error('Byte data cannot be empty');
    }

    const now = Date.now();
    const newImage: ImageDataItem = {
      id: `img_${now}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      preview: generatePreviewImage(name, byteData),
      byteData,
      description: description?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };

    this.images.push(newImage);
    await this.saveToStorage();
    
    return newImage;
  }

  // Update existing image
  async updateImage(id: string, name?: string, byteString?: string, description?: string): Promise<ImageDataItem> {
    await this.initialize();
    
    const imageIndex = this.images.findIndex(img => img.id === id);
    if (imageIndex === -1) {
      throw new Error('Image not found');
    }

    const image = this.images[imageIndex];
    const updatedFields: Partial<ImageDataItem> = {};

    // Update name if provided
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error('Image name cannot be empty');
      }
      
      // Check for duplicate names (excluding current image)
      if (this.images.some(img => img.id !== id && img.name.toLowerCase() === trimmedName.toLowerCase())) {
        throw new Error('An image with this name already exists');
      }
      
      updatedFields.name = trimmedName;
    }

    // Update byte data if provided
    if (byteString !== undefined) {
      try {
        const byteData = parseByteString(byteString);
        if (byteData.length === 0) {
          throw new Error('Byte data cannot be empty');
        }
        updatedFields.byteData = byteData;
        updatedFields.preview = generatePreviewImage(updatedFields.name || image.name, byteData);
      } catch (error) {
        throw new Error(`Invalid byte data: ${(error as Error).message}`);
      }
    }

    // Update description if provided
    if (description !== undefined) {
      updatedFields.description = description.trim();
    }

    // Update the image
    const updatedImage = {
      ...image,
      ...updatedFields,
      updatedAt: Date.now(),
    };

    this.images[imageIndex] = updatedImage;
    await this.saveToStorage();
    
    return updatedImage;
  }

  // Delete image
  async deleteImage(id: string): Promise<boolean> {
    await this.initialize();
    
    const imageIndex = this.images.findIndex(img => img.id === id);
    if (imageIndex === -1) {
      return false;
    }

    this.images.splice(imageIndex, 1);
    await this.saveToStorage();
    
    return true;
  }

  // Clear all images
  async clearAllImages(): Promise<void> {
    await this.initialize();
    this.images = [];
    await this.saveToStorage();
  }

  // Get total count
  async getImageCount(): Promise<number> {
    await this.initialize();
    return this.images.length;
  }

  // Validate byte data format
  static validateByteString(byteString: string): { isValid: boolean; error?: string; byteCount?: number } {
    try {
      const bytes = parseByteString(byteString);
      return { 
        isValid: true, 
        byteCount: bytes.length 
      };
    } catch (error) {
      return { 
        isValid: false, 
        error: (error as Error).message 
      };
    }
  }
}

// Export singleton instance
export const imageStorageService = new ImageStorageService();

// Legacy compatibility - create a hook to get images
export const useImageDatabase = () => {
  const [images, setImages] = React.useState<ImageDataItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refreshImages = async () => {
    try {
      setLoading(true);
      setError(null);
      const allImages = await imageStorageService.getAllImages();
      setImages(allImages);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    refreshImages();
  }, []);

  return {
    images,
    loading,
    error,
    refreshImages,
  };
};

// Import React for the hook
import * as React from 'react';

// Export the interface for backward compatibility
export { ImageDataItem as ImageDataItemType };