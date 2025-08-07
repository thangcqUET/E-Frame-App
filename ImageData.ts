export interface ImageDataItem {
  id: string;
  name: string;
  preview: string; // Base64 or require() path for preview
  byteData: number[]; // 15000 bytes of raw data
  description?: string;
}

// Sample image data - replace with your actual images and byte data
export const imageDatabase: ImageDataItem[] = [
  {
    id: "image_1",
    name: "Sample Image 1",
    preview: "https://via.placeholder.com/150x100/FF6B6B/FFFFFF?text=Image+1", // Replace with actual image
    byteData: new Array(15000).fill(0).map((_, i) => (i + 0x73) % 256), // Sample data
    description: "First sample image"
  },
  {
    id: "image_2", 
    name: "Sample Image 2",
    preview: "https://via.placeholder.com/150x100/4ECDC4/FFFFFF?text=Image+2", // Replace with actual image
    byteData: new Array(15000).fill(0).map((_, i) => (i + 0x36) % 256), // Sample data
    description: "Second sample image"
  },
  {
    id: "image_3",
    name: "Sample Image 3", 
    preview: "https://via.placeholder.com/150x100/45B7D1/FFFFFF?text=Image+3", // Replace with actual image
    byteData: new Array(15000).fill(0).map((_, i) => (i + 0xcb) % 256), // Sample data
    description: "Third sample image"
  },
  {
    id: "image_4",
    name: "Sample Image 4",
    preview: "https://via.placeholder.com/150x100/F7DC6F/000000?text=Image+4", // Replace with actual image  
    byteData: new Array(15000).fill(0).map((_, i) => (i + 0xd6) % 256), // Sample data
    description: "Fourth sample image"
  },
  {
    id: "image_5",
    name: "Sample Image 5",
    preview: "https://via.placeholder.com/150x100/BB8FCE/FFFFFF?text=Image+5", // Replace with actual image
    byteData: new Array(15000).fill(0).map((_, i) => (i + 0xd9) % 256), // Sample data  
    description: "Fifth sample image"
  },
  {
    id: "image_6",
    name: "Sample Image 6",
    preview: "https://via.placeholder.com/150x100/85C1E9/FFFFFF?text=Image+6", // Replace with actual image
    byteData: new Array(15000).fill(0).map((_, i) => (i + 0xdc) % 256), // Sample data
    description: "Sixth sample image"
  }
];

// Helper function to get image by ID
export const getImageById = (id: string): ImageDataItem | undefined => {
  return imageDatabase.find(img => img.id === id);
};

// Helper function to get all image previews for selection
export const getAllImages = (): ImageDataItem[] => {
  return imageDatabase;
};
