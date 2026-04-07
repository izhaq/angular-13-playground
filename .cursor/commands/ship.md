---
description: Run the pre-launch checklist and prepare for production deployment
---

# /ship — Deploy with Confidence

Follow the `shipping-and-launch` skill.

## Pre-Launch Checklist

### Code Quality
- [ ] All tests pass: `ng test --no-watch --browsers=ChromeHeadless`
- [ ] Build is clean: `ng build --configuration production`
- [ ] Linting passes: `ng lint`
- [ ] No TODO/FIXME items in changed code
- [ ] No `console.log` statements in production code

### Security
- [ ] No secrets in code or version control
- [ ] User input validated at boundaries
- [ ] Authentication/authorization checks in place
- [ ] Dependencies audited: `npm audit`

### Performance
- [ ] Core Web Vitals within targets (LCP < 2.5s, CLS < 0.1, INP < 200ms)
- [ ] Bundle size checked
- [ ] No N+1 patterns
- [ ] Images optimized, lazy loaded

### Accessibility
- [ ] Keyboard navigation works (Tab through the page)
- [ ] Screen reader compatible
- [ ] Color contrast adequate (4.5:1 for normal text)

### Infrastructure
- [ ] Environment variables configured
- [ ] Monitoring/error tracking in place

### Documentation
- [ ] README current
- [ ] Architecture decisions documented (ADRs if applicable)
- [ ] Changelog updated

## Rollback Plan

Before deploying, define:
- How to detect problems (metrics, alerts)
- How to roll back (revert commit, feature flag)
- Who to notify if rollback is needed

Report any failing checks and help resolve them before deployment.
