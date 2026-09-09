/**
 * ErrorBoundary.jsx
 * Purpose: Catch render crashes so the app never whites out.
 * Recovery is a friendly message plus Try again — no stack traces.
 */
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Recall Ledger UI error', error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <section className="error-boundary" role="alert">
          <h1 className="error-boundary-title">Something went wrong</h1>
          <p className="error-boundary-copy">
            We hit an unexpected problem. You can try again without leaving this
            page.
          </p>
          <button type="button" onClick={this.handleRetry}>
            Try again
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}
