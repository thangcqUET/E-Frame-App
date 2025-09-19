import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  Image, 
  Dimensions,
  SafeAreaView,
  Modal
} from 'react-native';
import { Device } from 'react-native-ble-plx';
import { ImageDataItem, useImageDatabase } from './ImageStorageService';
import ImageManagementModal from './ImageManagementModal';

interface ConnectedDeviceScreenProps {
  device: Device;
  isConnected: boolean;
  color: string;
  onDisconnect: () => void;
  onStartStreaming: (data: number[]) => void;
  streamingProgress: number;
  isStreaming: boolean;
  streamingStatus: string;
}

const { width } = Dimensions.get('window');
const imageSize = (width - 100) / 2; // 2 images per row with margins and gap

const ConnectedDeviceScreen: React.FC<ConnectedDeviceScreenProps> = ({
  device,
  isConnected,
  color,
  onDisconnect,
  onStartStreaming,
  streamingProgress,
  isStreaming,
  streamingStatus,
}) => {
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isManageModalVisible, setIsManageModalVisible] = useState(false);
  const { images, refreshImages } = useImageDatabase();

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Device',
      `Are you sure you want to disconnect from ${device.name || device.id}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: onDisconnect,
        },
      ]
    );
  };

  const handleImageSelect = (imageId: string) => {
    if (!isStreaming) {
      setSelectedImageId(imageId);
    }
  };

  const handleSendImage = () => {
    if (!selectedImageId) {
      Alert.alert('No Image Selected', 'Please select an image to send.');
      return;
    }

    const selectedImage = images.find(img => img.id === selectedImageId);
    if (selectedImage) {
      Alert.alert(
        'Send Image',
        `Send "${selectedImage.name}" to the device?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Send',
            onPress: () => onStartStreaming(selectedImage.byteData),
          },
        ]
      );
    }
  };

  const handleManageImages = () => {
    setIsManageModalVisible(true);
  };

  const handleImagesChanged = () => {
    refreshImages();
    // Reset selection if the selected image was deleted
    if (selectedImageId && !images.find(img => img.id === selectedImageId)) {
      setSelectedImageId(null);
    }
  };

  const renderProgressBar = () => {
    return (
      <Modal
        visible={isStreaming || streamingProgress > 0}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.progressModal}>
            <Text style={styles.progressText}>{streamingStatus}</Text>
            <View style={styles.progressBarBackground}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${streamingProgress}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressPercentage}>{streamingProgress}%</Text>
          </View>
        </View>
      </Modal>
    );
  };

  const renderImageGrid = () => {
    if (images.length === 0) {
      return (
        <View style={styles.emptyImagesContainer}>
          <Text style={styles.emptyImagesText}>No images available</Text>
          <Text style={styles.emptyImagesSubtext}>Tap "Manage Images" to add your first image</Text>
        </View>
      );
    }

    return (
      <View style={styles.imageGrid}>
        {images.map((image: ImageDataItem) => (
          <TouchableOpacity
            key={image.id}
            style={[
              styles.imageContainer,
              selectedImageId === image.id && styles.selectedImageContainer,
              isStreaming && styles.disabledImageContainer,
            ]}
            onPress={() => handleImageSelect(image.id)}
            disabled={isStreaming}
          >
            <Image source={{ uri: image.preview }} style={styles.imagePreview} />
            <Text style={styles.imageName}>{image.name}</Text>
            <Text style={styles.imageSize}>{image.byteData.length} bytes</Text>
            {selectedImageId === image.id && (
              <View style={styles.selectedOverlay}>
                <Text style={styles.selectedText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: color }]}>
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 100 }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Device Connected</Text>
          <View style={[styles.statusIndicator, isConnected ? styles.connected : styles.disconnected]} />
        </View>

        {/* Device Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Device Information</Text>
          <View style={styles.deviceInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name:</Text>
              <Text style={styles.infoValue}>{device.name || "Unknown"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ID:</Text>
              <Text style={styles.infoValue}>{device.id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text style={[styles.infoValue, isConnected ? styles.connectedText : styles.disconnectedText]}>
                {isConnected ? "Connected" : "Disconnected"}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={[styles.disconnectButtonInCard, isStreaming && styles.disabledButton]}
            onPress={handleDisconnect}
            disabled={isStreaming}
          >
            <Text style={[styles.disconnectButtonText, isStreaming && styles.disabledButtonText]}>
              Disconnect Device
            </Text>
          </TouchableOpacity>
        </View>

        {/* Image Selection Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <Text style={styles.cardTitle}>Select Image to Send</Text>
              <TouchableOpacity
                style={styles.manageButton}
                onPress={handleManageImages}
              >
                <Text style={styles.manageButtonText}>Manage Images</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.cardSubtitle}>
            Choose an image from the gallery below. Each image contains display data for the e-paper device.
          </Text>
          {renderImageGrid()}
        </View>
      </ScrollView>

      {/* Fixed Button Container */}
      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!selectedImageId || isStreaming || !isConnected) && styles.disabledButton,
          ]}
          onPress={handleSendImage}
          disabled={!selectedImageId || isStreaming || !isConnected}
        >
          <Text style={[
            styles.sendButtonText,
            (!selectedImageId || isStreaming || !isConnected) && styles.disabledButtonText,
          ]}>
            {isStreaming ? 'Sending...' : 'Send Selected Image'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress Modal */}
      {renderProgressBar()}

      {/* Image Management Modal */}
      <ImageManagementModal
        visible={isManageModalVisible}
        onClose={() => setIsManageModalVisible(false)}
        onImagesChanged={handleImagesChanged}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginRight: 10,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  connected: {
    backgroundColor: "#4CAF50",
  },
  disconnected: {
    backgroundColor: "#F44336",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
    lineHeight: 20,
  },
  deviceInfo: {
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 16,
    color: "#333",
    flex: 1,
    textAlign: "right",
  },
  connectedText: {
    color: "#4CAF50",
    fontWeight: "bold",
  },
  disconnectedText: {
    color: "#F44336",
    fontWeight: "bold",
  },
  // Modal overlay styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressModal: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 30,
    margin: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 250,
  },
  // Progress bar styles (now for modal)
  progressContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  progressText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    marginBottom: 8,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  // Image grid styles
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  imageContainer: {
    width: imageSize,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  selectedImageContainer: {
    borderColor: "#2196F3",
    backgroundColor: "#E3F2FD",
  },
  disabledImageContainer: {
    opacity: 0.5,
  },
  imagePreview: {
    width: "100%",
    height: imageSize * 0.7,
    borderRadius: 6,
    backgroundColor: "#E0E0E0",
    marginBottom: 8,
    
  },
  imageName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 4,
  },
  imageSize: {
    fontSize: 1,
    color: "#666",
    textAlign: "center",
  },
  selectedOverlay: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "#2196F3",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Button styles
  buttonContainer: {
    marginTop: 20,
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingBottom: 7,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sendButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: "center",
  },
  sendButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  disconnectButton: {
    backgroundColor: "#FF6060",
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
  },
  disconnectButtonInCard: {
    backgroundColor: "#FF6060",
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    marginTop: 15,
  },
  disconnectButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  disabledButton: {
    backgroundColor: "#CCCCCC",
  },
  disabledButtonText: {
    color: "#999999",
  },
  // Card header styles for manage button
  cardHeader: {
    marginBottom: 0,
  },
  cardTitleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  manageButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  manageButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  // Empty images state
  emptyImagesContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyImagesText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyImagesSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default ConnectedDeviceScreen;
