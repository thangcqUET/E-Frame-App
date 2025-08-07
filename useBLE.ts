/* eslint-disable no-bitwise */
import { useMemo, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";

import * as ExpoDevice from "expo-device";

import base64 from "react-native-base64";
import {
  BleError,
  BleManager,
  Characteristic,
  Descriptor,
  Device,
} from "react-native-ble-plx";

const DATA_SERVICE_UUID = "000000ff-0000-1000-8000-00805f9b34fb";
const COLOR_CHARACTERISTIC_UUID = "0000ff01-0000-1000-8000-00805f9b34fb";

const bleManager = new BleManager();

// Helper function to convert byte array to Base64
const bytesToBase64 = (bytes: number[]): string => {
  const uint8Array = new Uint8Array(bytes);
  let binaryString = '';
  uint8Array.forEach(byte => {
    binaryString += String.fromCharCode(byte);
  });
  return base64.encode(binaryString);
};

function useBLE() {
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [color, setColor] = useState("white");
  const [isConnected, setIsConnected] = useState(false);
  const [streamingProgress, setStreamingProgress] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStatus, setStreamingStatus] = useState<string>("");

  // Handle device disconnection
  const onDeviceDisconnected = (error: BleError | null, device: Device | null) => {
    if (device) {
      console.log(`Device ${device.name || device.id} disconnected`);
      setConnectedDevice(null);
      setIsConnected(false);
      
      if (error) {
        console.log("Disconnection error:", error);
        console.log("Error code:", error.errorCode);
        console.log("Error message:", error.message);
        
        // Handle different types of disconnection based on error message or reason
        if (error.message.includes("out of range") || error.message.includes("timeout")) {
          console.log("Device went out of range or connection timeout");
        } else if (error.message.includes("connection lost")) {
          console.log("Connection lost unexpectedly");
        }
      } else {
        console.log("Device disconnected gracefully");
      }
    }
  };

  // Monitor device connection status
  const monitorDeviceConnection = (device: Device) => {
    const subscription = bleManager.onDeviceDisconnected(
      device.id,
      onDeviceDisconnected
    );
    
    // Store subscription for cleanup later
    return subscription;
  };

  const requestAndroid31Permissions = async () => {
    const bluetoothScanPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      {
        title: "Location Permission",
        message: "Bluetooth Low Energy requires Location",
        buttonPositive: "OK",
      }
    );
    const bluetoothConnectPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      {
        title: "Location Permission",
        message: "Bluetooth Low Energy requires Location",
        buttonPositive: "OK",
      }
    );
    const fineLocationPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: "Location Permission",
        message: "Bluetooth Low Energy requires Location",
        buttonPositive: "OK",
      }
    );

    return (
      bluetoothScanPermission === "granted" &&
      bluetoothConnectPermission === "granted" &&
      fineLocationPermission === "granted"
    );
  };

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      if ((ExpoDevice.platformApiLevel ?? -1) < 31) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location Permission",
            message: "Bluetooth Low Energy requires Location",
            buttonPositive: "OK",
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const isAndroid31PermissionsGranted =
          await requestAndroid31Permissions();

        return isAndroid31PermissionsGranted;
      }
    } else {
      return true;
    }
  };

  const connectToDevice = async (device: Device) => {
    try {
      console.log("Connecting to device:", device.name || device.id);
      const deviceConnection = await bleManager.connectToDevice(device.id);
      setConnectedDevice(deviceConnection);
      
      // Start monitoring for disconnection
      const disconnectSubscription = monitorDeviceConnection(deviceConnection);
      
      await deviceConnection.discoverAllServicesAndCharacteristics();
      bleManager.stopDeviceScan();
      setIsConnected(true);
      
      console.log("Successfully connected to device:", deviceConnection.name || deviceConnection.id);

      // startStreamingData(deviceConnection);
    } catch (e) {
      console.log("FAILED TO CONNECT", e);
      setIsConnected(false);
      setConnectedDevice(null);
    }
  };

  const isDuplicteDevice = (devices: Device[], nextDevice: Device) =>
    devices.findIndex((device) => nextDevice.id === device.id) > -1;

  const scanForPeripherals = () =>
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log(error);
      }

      if (
        device && (device.localName === "Khung ảnh của Hà" || device.name === "Khung ảnh của Hà")
      ) {
        setAllDevices((prevState: Device[]) => {
          if (!isDuplicteDevice(prevState, device)) {
            return [...prevState, device];
          }
          return prevState;
        });
      }
    });

  const onDataUpdate = (
    error: BleError | null,
    characteristic: Characteristic | null
  ) => {
    if (error) {
      console.log(error);
      return;
    } else if (!characteristic?.value) {
      console.log("No Data was received");
      return;
    }

    const colorCode = base64.decode(characteristic.value);

    let color = "white";
    if (colorCode === "B") {
      color = "blue";
    } else if (colorCode === "R") {
      color = "red";
    } else if (colorCode === "G") {
      color = "green";
    }

    setColor(color);
  };

  const startStreamingData = async (device: Device, byteData: number[]) => {
    try {
      if (device) {
        console.log("Starting Data Stream for", device.name);
        
        // Initialize streaming state
        setIsStreaming(true);
        setStreamingProgress(0);
        setStreamingStatus("Requesting MTU...");
        
        const mtuRequestRes = await device.requestMTU(303);
        console.log("MTU Request Result:");
        console.log(mtuRequestRes);
        
        console.log("Data length:", byteData.length);
        setStreamingStatus("Preparing data chunks...");
        
        const chunks = [];
        const limitBytes = 300; // Maximum bytes per chunk
        for (let i = 0; i < byteData.length; i += limitBytes) {
          chunks.push(byteData.slice(i, i + limitBytes));
        }
        
        setStreamingStatus("Streaming data...");
        let count = 0;
        
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          await device.writeCharacteristicWithResponseForService(
            DATA_SERVICE_UUID,
            COLOR_CHARACTERISTIC_UUID,
            bytesToBase64(chunk)
          );
          count += chunk.length;
          const progress = Math.round((count / byteData.length) * 100);
          setStreamingProgress(progress);
          setStreamingStatus(`Streaming... ${progress}% (${count}/${byteData.length} bytes)`);
          console.log("Percent of bytes sent:", progress, "%");
          
          // Wait for a short period to avoid overwhelming the device
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        
        setStreamingStatus("Sending completion signal...");
        
        // Send completion signal
        const endMarker = [0xFF, 0xFF, 0xFF, 0xFF]; // Special end marker bytes
        await device.writeCharacteristicWithResponseForService(
          DATA_SERVICE_UUID,
          COLOR_CHARACTERISTIC_UUID,
          bytesToBase64(endMarker)
        );
        
        // Complete streaming
        setStreamingProgress(100);
        setStreamingStatus("Streaming completed successfully!");
        setIsStreaming(false);
        console.log("End marker sent - transmission complete");
        
        // Reset status after a delay
        setTimeout(() => {
          setStreamingStatus("");
          setStreamingProgress(0);
        }, 2000);
        
      } else {
        console.log("No Device Connected");
        setStreamingStatus("Error: No device connected");
        setIsStreaming(false);
      }
    } catch (error) {
      console.log("Error occurred while streaming data:");
      console.log(error);
      setStreamingStatus("Error: Streaming failed");
      setIsStreaming(false);
      
      // Reset after error
      setTimeout(() => {
        setStreamingStatus("");
        setStreamingProgress(0);
      }, 3000);
    }
  };

  // Manual disconnect function
  const disconnectDevice = async () => {
    try {
      if (connectedDevice) {
        console.log("Manually disconnecting device:", connectedDevice.name || connectedDevice.id);
        await connectedDevice.cancelConnection();
        setConnectedDevice(null);
        setIsConnected(false);
        console.log("Device disconnected successfully");
      } else {
        console.log("No device to disconnect");
      }
    } catch (error) {
      console.log("Error disconnecting device:", error);
    }
  };

  return {
    connectToDevice,
    disconnectDevice,
    allDevices,
    connectedDevice,
    color,
    isConnected,
    requestPermissions,
    scanForPeripherals,
    startStreamingData,
    streamingProgress,
    isStreaming,
    streamingStatus,
  };
}

export default useBLE;
