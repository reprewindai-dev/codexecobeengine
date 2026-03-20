# ECOBE Carbon-Aware GitHub Action

Make your GitHub Actions workflows carbon-aware by automatically selecting the optimal runner based on real-time carbon intensity data.

## 🌱 What It Does

The ECOBE Carbon-Aware Runner analyzes carbon intensity across available GitHub Actions runner regions and selects the most environmentally friendly option that meets your requirements.

### Key Features

- **Real-time Carbon Data**: Uses live carbon intensity signals from multiple providers
- **Regional Optimization**: Considers US, EU, and Asia-Pacific runner regions
- **Configurable Priorities**: Balance carbon savings vs. performance needs
- **Audit Trail**: Full decision logging and replayability
- **Fallback Protection**: Always returns a valid runner, even with degraded signals

## 🚀 Quick Start

```yaml
name: Carbon-Aware CI

on: [push, pull_request]

jobs:
  carbon-aware-test:
    runs-on: ubuntu-latest
    steps:
      - name: Select Carbon-Aware Runner
        id: carbon-runner
        uses: ./github-action
        with:
          engine-url: ${{ secrets.ECOBE_ENGINE_URL }}
          api-key: ${{ secrets.ECOBE_ENGINE_API_KEY }}
          preferred-regions: 'us-east-1,us-west-2,eu-west-1'
          carbon-weight: 0.8
      
      - name: Run Tests on Selected Runner
        uses: actions/checkout@v4
        with:
          runner: ${{ steps.carbon-runner.outputs.selected-runner }}
      
      - name: Display Carbon Impact
        run: |
          echo "🌍 Region: ${{ steps.carbon-runner.outputs.selected-region }}"
          echo "⚡ Carbon: ${{ steps.carbon-runner.outputs.carbon-intensity }} gCO2/kWh"
          echo "💰 Savings: ${{ steps.carbon-runner.outputs.savings }}%"
```

## 📋 Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `engine-url` | ECOBE Engine URL | ✅ | - |
| `api-key` | ECOBE Engine API Key | ✅ | - |
| `preferred-regions` | Preferred runner regions (comma-separated) | ❌ | `us-east-1,us-west-2,eu-west-1` |
| `job-type` | Type of job affecting carbon weighting | ❌ | `standard` |
| `carbon-weight` | Carbon importance weight (0-1) | ❌ | `0.7` |
| `timeout-seconds` | API call timeout | ❌ | `30` |

### Job Types

- `standard`: Normal CI/CD workloads
- `heavy`: Resource-intensive jobs (builds, deployments)
- `light`: Quick checks and validations

## 📤 Outputs

| Output | Description |
|--------|-------------|
| `selected-runner` | Optimal GitHub Actions runner |
| `selected-region` | Selected geographic region |
| `carbon-intensity` | Carbon intensity in gCO2/kWh |
| `baseline` | Baseline carbon intensity for comparison |
| `savings` | Carbon savings percentage |
| `recommendation` | Routing recommendation details |
| `decision-id` | Decision frame ID for audit/replay |

## 🔧 Configuration

### Environment Variables

Set these in your GitHub repository secrets:

```bash
ECOBE_ENGINE_URL=https://your-ecobe-engine.com
ECOBE_ENGINE_API_KEY=your-api-key
```

### Regional Preferences

```yaml
# US-focused (lowest carbon in North America)
preferred-regions: 'us-east-1,us-west-2,us-central-1'

# EU-focused (renewable energy heavy)
preferred-regions: 'eu-west-1,eu-central-1,eu-west-2'

# Global optimization
preferred-regions: 'us-east-1,eu-west-1,ap-southeast-1'
```

### Carbon Weighting

```yaml
# High carbon priority (maximize environmental benefit)
carbon-weight: 0.9

# Balanced approach
carbon-weight: 0.5

# Performance priority (minimize carbon impact on speed)
carbon-weight: 0.3
```

## 📊 Example Workflows

### Basic Carbon-Aware CI

```yaml
name: Carbon-Aware CI

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: ./github-action
        id: runner
        with:
          engine-url: ${{ secrets.ECOBE_ENGINE_URL }}
          api-key: ${{ secrets.ECOBE_ENGINE_API_KEY }}
      
      - name: Run Tests
        uses: actions/checkout@v4
        with:
          runner: ${{ steps.runner.outputs.selected-runner }}
```

### Multi-Region Optimization

```yaml
name: Global Carbon-Aware Build

on: [push]

jobs:
  build:
    strategy:
      matrix:
        region: [us-east-1, eu-west-1, ap-southeast-1]
    runs-on: ubuntu-latest
    steps:
      - uses: ./github-action
        id: runner
        with:
          engine-url: ${{ secrets.ECOBE_ENGINE_URL }}
          api-key: ${{ secrets.ECOBE_ENGINE_API_KEY }}
          preferred-regions: ${{ matrix.region }}
          carbon-weight: 0.8
      
      - name: Build for Region
        run: npm run build
        if: steps.runner.outputs.selected-region == matrix.region
```

### Heavy Workload Optimization

```yaml
name: Carbon-Aware Deployment

on: [push to main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: ./github-action
        id: runner
        with:
          engine-url: ${{ secrets.ECOBE_ENGINE_URL }}
          api-key: ${{ secrets.ECOBE_ENGINE_API_KEY }}
          job-type: heavy
          carbon-weight: 0.9
      
      - name: Deploy
        run: npm run deploy
```

## 📈 Monitoring and Auditing

### Decision Tracking

Each routing decision includes a `decision-id` for audit and replay:

```yaml
- name: Log Decision
  run: |
    echo "Decision ID: ${{ steps.runner.outputs.decision-id }}"
    echo "View details at: https://your-ecobe-engine.com/audit/${{ steps.runner.outputs.decision-id }}"
```

### Carbon Impact Reporting

```yaml
- name: Carbon Report
  run: |
    echo "🌱 Carbon Impact Report"
    echo "Region: ${{ steps.runner.outputs.selected-region }}"
    echo "Intensity: ${{ steps.runner.outputs.carbon-intensity }} gCO2/kWh"
    echo "Savings: ${{ steps.runner.outputs.savings }}% vs baseline"
    echo "Recommendation: ${{ steps.runner.outputs.recommendation }}"
```

## 🛠️ Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Verify `ECOBE_ENGINE_URL` and `ECOBE_ENGINE_API_KEY` secrets
   - Check network connectivity and firewall rules

2. **No Runner Selected**
   - Action always falls back to `ubuntu-latest` if API fails
   - Check ECOBE Engine logs for detailed error information

3. **High Carbon Values**
   - Carbon intensity varies by time of day and region
   - Consider adjusting `carbon-weight` based on your priorities

### Debug Mode

Enable verbose logging:

```yaml
- name: Debug Carbon Selection
  run: |
    echo "Full response available in action logs"
    echo "Check ECOBE Engine dashboard for detailed routing analysis"
```

## 🤝 Contributing

This action is part of the ECOBE carbon-aware computing platform. For issues, feature requests, or contributions:

1. Check the [ECOBE Engine documentation](https://docs.ecobe.com)
2. Review the [routing algorithm details](https://docs.ecobe.com/routing)
3. Submit issues with `decision-id` for debugging

## 📄 License

This action is released under the MIT License. See LICENSE for details.

## 🔗 Related Resources

- [ECOBE Engine Documentation](https://docs.ecobe.com)
- [Carbon Intensity Data Sources](https://docs.ecobe.com/data-sources)
- [Routing Algorithm Details](https://docs.ecobe.com/routing-algorithm)
- [Environmental Impact Calculator](https://docs.ecobe.com/impact-calculator)
