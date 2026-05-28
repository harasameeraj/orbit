import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadows } from '../../theme/colors';

/**
 * React Error Boundary — catches JS runtime crashes in the component tree
 * and renders a recovery UI instead of a white screen.
 * Must be a class component (hooks don't support componentDidCatch).
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('ErrorBoundary caught:', error?.message, errorInfo?.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="warning-outline" size={36} color={Colors.accentAmber} />
            </View>

            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              The app encountered an unexpected error. This has been logged automatically.
            </Text>

            {__DEV__ && this.state.error?.message ? (
              <ScrollView style={styles.errorBox} contentContainerStyle={{ padding: 12 }}>
                <Text style={styles.errorText}>{this.state.error.message}</Text>
              </ScrollView>
            ) : null}

            <TouchableOpacity style={styles.retryBtn} onPress={this.handleRetry} activeOpacity={0.8}>
              <Ionicons name="refresh" size={18} color={Colors.white} />
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius['2xl'],
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    ...Shadows.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accentAmberLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: Colors.accentRedLight,
    borderRadius: Radius.md,
    maxHeight: 120,
    width: '100%',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 12,
    color: Colors.accentRed,
    fontFamily: 'monospace',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.brand,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: '100%',
  },
  retryText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
