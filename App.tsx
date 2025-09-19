import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DeviceModal from "./DeviceConnectionModal";
import ConnectedDeviceScreen from "./ConnectedDeviceScreen";
import useBLE from "./useBLE";
import { imageStorageService } from "./ImageStorageService";

const App = () => {
  const {
    allDevices,
    connectedDevice,
    connectToDevice,
    disconnectDevice,
    color,
    isConnected,
    requestPermissions,
    scanForPeripherals,
    startStreamingData,
    streamingProgress,
    isStreaming,
    streamingStatus,
  } = useBLE();
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  // Initialize the image storage service when the app starts
  useEffect(() => {
    imageStorageService.initialize().catch(console.error);
  }, []);

  const scanForDevices = async () => {
    const isPermissionsEnabled = await requestPermissions();
    if (isPermissionsEnabled) {
      scanForPeripherals();
    }
  };

  const hideModal = () => {
    setIsModalVisible(false);
  };

  const openModal = async () => {
    scanForDevices();
    setIsModalVisible(true);
  };

  const handleStartStreaming = (data: number[]) => {
    if (connectedDevice) {
      startStreamingData(connectedDevice, data);
    }
  };

  const handleDisconnect = async () => {
    await disconnectDevice();
  };

  // If device is connected, show the connected device screen
  if (connectedDevice && isConnected) {
    return (
      <ConnectedDeviceScreen
        device={connectedDevice}
        isConnected={isConnected}
        color={color}
        onDisconnect={handleDisconnect}
        onStartStreaming={handleStartStreaming}
        streamingProgress={streamingProgress}
        isStreaming={isStreaming}
        streamingStatus={streamingStatus}
      />
    );
  }

  // Otherwise, show the connection screen
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: color }]}>
      <View style={styles.heartRateTitleWrapper}>
        {connectedDevice ? (
          <>
            <Text style={styles.heartRateTitleText}>Connected</Text>
          </>
        ) : (
          <Text style={styles.heartRateTitleText}>
            Please connect the E-Frame
          </Text>
        )}
      </View>
      <TouchableOpacity onPress={openModal} style={styles.ctaButton}>
        <Text style={styles.ctaButtonText}>Connect</Text>
      </TouchableOpacity>
      <DeviceModal
        closeModal={hideModal}
        visible={isModalVisible}
        connectToPeripheral={connectToDevice}
        devices={allDevices}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f2",
  },
  heartRateTitleWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  heartRateTitleText: {
    fontSize: 30,
    fontWeight: "bold",
    textAlign: "center",
    marginHorizontal: 20,
    color: "black",
  },
  heartRateText: {
    fontSize: 25,
    marginTop: 15,
  },
  ctaButton: {
    backgroundColor: "#FF6060",
    justifyContent: "center",
    alignItems: "center",
    height: 50,
    marginHorizontal: 20,
    marginBottom: 5,
    borderRadius: 8,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
});

export default App;
