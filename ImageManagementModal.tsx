import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { ImageDataItem, imageStorageService, parseByteString, bytesToHexString } from './ImageStorageService';

interface ImageManagementModalProps {
  visible: boolean;
  onClose: () => void;
  onImagesChanged: () => void;
}

interface FormData {
  name: string;
  byteString: string;
  description: string;
}

type ModalMode = 'list' | 'add' | 'edit';

const ImageManagementModal: React.FC<ImageManagementModalProps> = ({
  visible,
  onClose,
  onImagesChanged,
}) => {
  const [mode, setMode] = React.useState<ModalMode>('list');
  const [images, setImages] = React.useState<ImageDataItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [editingImage, setEditingImage] = React.useState<ImageDataItem | null>(null);
  const [formData, setFormData] = React.useState<FormData>({
    name: '',
    byteString: '',
    description: '',
  });

  // Load images when modal opens
  React.useEffect(() => {
    if (visible) {
      loadImages();
      setMode('list');
    }
  }, [visible]);

  const loadImages = async () => {
    try {
      setLoading(true);
      const allImages = await imageStorageService.getAllImages();
      setImages(allImages);
    } catch (error) {
      Alert.alert('Error', 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      byteString: '',
      description: '',
    });
    setEditingImage(null);
  };

  const handleAdd = () => {
    resetForm();
    setMode('add');
  };

  const handleEdit = (image: ImageDataItem) => {
    setEditingImage(image);
    setFormData({
      name: image.name,
      byteString: bytesToHexString(image.byteData),
      description: image.description || '',
    });
    setMode('edit');
  };

  const handleDelete = (image: ImageDataItem) => {
    Alert.alert(
      'Delete Image',
      `Are you sure you want to delete "${image.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await imageStorageService.deleteImage(image.id);
              await loadImages();
              onImagesChanged();
              Alert.alert('Success', 'Image deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete image');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter an image name');
      return;
    }

    if (!formData.byteString.trim()) {
      Alert.alert('Error', 'Please enter byte data');
      return;
    }

    try {
      setLoading(true);
      
      if (mode === 'add') {
        await imageStorageService.addImage(
          formData.name,
          formData.byteString,
          formData.description
        );
        Alert.alert('Success', 'Image added successfully');
      } else if (mode === 'edit' && editingImage) {
        await imageStorageService.updateImage(
          editingImage.id,
          formData.name,
          formData.byteString,
          formData.description
        );
        Alert.alert('Success', 'Image updated successfully');
      }

      await loadImages();
      onImagesChanged();
      setMode('list');
      resetForm();
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const validateByteString = (text: string) => {
    try {
      if (!text.trim()) return null;
      parseByteString(text);
      return null;
    } catch (error) {
      return (error as Error).message;
    }
  };

  const renderImageList = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Images</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>+ Add New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading images...</Text>
        </View>
      ) : images.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No images saved yet</Text>
          <Text style={styles.emptySubtext}>Tap "Add New" to create your first image</Text>
        </View>
      ) : (
        <ScrollView style={styles.imageList} showsVerticalScrollIndicator={false}>
          {images.map((image) => (
            <View key={image.id} style={styles.imageItem}>
              <View style={styles.imageInfo}>
                <Text style={styles.imageName}>{image.name}</Text>
                <Text style={styles.imageDetails}>
                  {image.byteData.length} bytes
                  {image.description ? ` • ${image.description}` : ''}
                </Text>
                <Text style={styles.imageDate}>
                  Created: {new Date(image.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.imageActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => handleEdit(image)}
                >
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(image)}
                >
                  <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const byteError = validateByteString(formData.byteString);

  const renderForm = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.content}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => setMode('list')}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'add' ? 'Add New Image' : 'Edit Image'}
        </Text>
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Image Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Enter image name"
            maxLength={50}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Byte Data *</Text>
          <Text style={styles.inputHint}>
            Enter bytes separated by commas, spaces, or line breaks. Formats: 0x92,0x91 or AB,CD or 146,145
          </Text>
          <TextInput
            style={[styles.input, styles.multilineInput, byteError ? styles.inputError : null]}
            value={formData.byteString}
            onChangeText={(text) => setFormData({ ...formData, byteString: text })}
            placeholder="0x92,0x91,0xAA,0xBB... or multi-line"
            multiline
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {byteError && <Text style={styles.errorText}>{byteError}</Text>}
          {!byteError && formData.byteString.trim() && (
            <Text style={styles.successText}>
              Valid: {parseByteString(formData.byteString).length} bytes
            </Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={styles.input}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Enter description"
            maxLength={200}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            (!formData.name.trim() || !formData.byteString.trim() || byteError) ? styles.disabledButton : null,
          ]}
          onPress={handleSave}
          disabled={!formData.name.trim() || !formData.byteString.trim() || !!byteError || loading}
        >
          <Text style={[
            styles.saveButtonText,
            (!formData.name.trim() || !formData.byteString.trim() || byteError) ? styles.disabledButtonText : null,
          ]}>
            {loading ? 'Saving...' : (mode === 'add' ? 'Add Image' : 'Update Image')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {mode === 'list' ? renderImageList() : renderForm()}
        
        <View style={styles.footer}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  imageList: {
    flex: 1,
  },
  imageItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  imageInfo: {
    flex: 1,
    marginRight: 15,
  },
  imageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  imageDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  imageDate: {
    fontSize: 12,
    color: '#999',
  },
  imageActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  form: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    lineHeight: 16,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#F44336',
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
  },
  successText: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  disabledButtonText: {
    color: '#999',
  },
  footer: {
    padding: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: 'white',
  },
  closeButton: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ImageManagementModal;