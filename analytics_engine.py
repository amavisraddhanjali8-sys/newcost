#!/usr/bin/env python3
"""
Python Analytics Engine for Cost & Project Profitability Management System.
Computes real-time project cost breakdowns, multi-tier margin calculations,
budget phase variances, risk indexing, and sensitivity metrics.
"""
import sys
import json

def calculate_project_profitability(project_data):
    """
    Computes comprehensive financial metrics for a project:
    - Materials Cost
    - Subcontractor Labour & Services Cost
    - Outsourced Services Cost
    - Total Cost of Goods Sold (COGS) / Project Cost
    - Phase-by-phase Budget vs Actuals & Variance
    - Gross Profit & Gross Margin %
    - Overhead & Contingency Allowance
    - Net Profit & Net Margin %
    - Profitability Health Score (0 - 100)
    """
    revenue = float(project_data.get('quotedPrice', 0))
    phases = project_data.get('phases', [])
    items = project_data.get('selectedItems', [])

    material_cost = 0.0
    subcontractor_cost = 0.0
    outsourced_cost = 0.0

    for item in items:
        if float(item.get('totalCost', 0)) > 0:
            discounted_cost = float(item.get('totalCost', 0))
        else:
            cost = float(item.get('unitCost', 0)) * float(item.get('quantity', 1))
            discount_pct = float(item.get('discountPct', 0))
            discounted_cost = cost * (1.0 - (discount_pct / 100.0))
        
        item_type = item.get('type', 'material')
        if item_type == 'material':
            material_cost += discounted_cost
        elif item_type == 'subcontractor':
            subcontractor_cost += discounted_cost
        elif item_type == 'outsourced':
            outsourced_cost += discounted_cost
        else:
            material_cost += discounted_cost

    total_direct_cost = material_cost + subcontractor_cost + outsourced_cost
    overhead_pct = float(project_data.get('overheadPct', 8.5))
    contingency_pct = float(project_data.get('contingencyPct', 5.0))

    overhead_amount = total_direct_cost * (overhead_pct / 100.0)
    contingency_amount = total_direct_cost * (contingency_pct / 100.0)
    total_project_cost = total_direct_cost + overhead_amount + contingency_amount

    gross_profit = revenue - total_direct_cost
    gross_margin_pct = (gross_profit / revenue * 100.0) if revenue > 0 else 0.0

    net_profit = revenue - total_project_cost
    net_margin_pct = (net_profit / revenue * 100.0) if revenue > 0 else 0.0

    # Phase Breakdown analysis
    phase_metrics = []
    total_planned_budget = 0.0
    for phase in phases:
        planned = float(phase.get('budget', 0))
        actual = float(phase.get('actualCost', 0))
        total_planned_budget += planned
        variance = planned - actual # positive is under budget, negative is over budget
        variance_pct = (variance / planned * 100.0) if planned > 0 else 0.0
        phase_metrics.append({
            'phaseId': phase.get('id'),
            'phaseName': phase.get('name'),
            'plannedBudget': planned,
            'actualCost': actual,
            'variance': variance,
            'variancePct': round(variance_pct, 2),
            'status': 'Under Budget' if variance >= 0 else 'Over Budget'
        })

    budget_variance = total_planned_budget - total_project_cost
    budget_variance_pct = (budget_variance / total_planned_budget * 100.0) if total_planned_budget > 0 else 0.0

    # Health score
    health_score = 100.0
    if net_margin_pct < 10:
        health_score -= 30
    elif net_margin_pct < 20:
        health_score -= 10
    
    if budget_variance < 0:
        health_score -= min(35, abs(budget_variance_pct) * 2)

    health_score = max(5.0, min(100.0, health_score))

    # Sensitivity Analysis (+5% material inflation, -10% volume, etc.)
    sensitivity = {
        'materialInflation5Pct': {
            'costImpact': round(material_cost * 0.05, 2),
            'revisedNetMarginPct': round(((net_profit - (material_cost * 0.05)) / revenue * 100.0) if revenue > 0 else 0, 2)
        },
        'labourRateHike8Pct': {
            'costImpact': round(subcontractor_cost * 0.08, 2),
            'revisedNetMarginPct': round(((net_profit - (subcontractor_cost * 0.08)) / revenue * 100.0) if revenue > 0 else 0, 2)
        }
    }

    return {
        'revenue': round(revenue, 2),
        'materialCost': round(material_cost, 2),
        'subcontractorCost': round(subcontractor_cost, 2),
        'outsourcedCost': round(outsourced_cost, 2),
        'totalDirectCost': round(total_direct_cost, 2),
        'overheadAmount': round(overhead_amount, 2),
        'contingencyAmount': round(contingency_amount, 2),
        'totalProjectCost': round(total_project_cost, 2),
        'grossProfit': round(gross_profit, 2),
        'grossMarginPct': round(gross_margin_pct, 2),
        'netProfit': round(net_profit, 2),
        'netMarginPct': round(net_margin_pct, 2),
        'totalPlannedBudget': round(total_planned_budget, 2),
        'budgetVariance': round(budget_variance, 2),
        'budgetVariancePct': round(budget_variance_pct, 2),
        'healthScore': round(health_score, 1),
        'phaseMetrics': phase_metrics,
        'sensitivity': sensitivity,
        'costDistribution': [
            {'category': 'Materials', 'amount': round(material_cost, 2), 'pct': round((material_cost / total_direct_cost * 100.0) if total_direct_cost > 0 else 0, 1)},
            {'category': 'Subcontractor Labour', 'amount': round(subcontractor_cost, 2), 'pct': round((subcontractor_cost / total_direct_cost * 100.0) if total_direct_cost > 0 else 0, 1)},
            {'category': 'Outsourced Services', 'amount': round(outsourced_cost, 2), 'pct': round((outsourced_cost / total_direct_cost * 100.0) if total_direct_cost > 0 else 0, 1)},
            {'category': 'Overheads & Contingency', 'amount': round(overhead_amount + contingency_amount, 2), 'pct': round(((overhead_amount + contingency_amount) / total_project_cost * 100.0) if total_project_cost > 0 else 0, 1)}
        ]
    }

def main():
    if len(sys.argv) > 1:
        raw_input = sys.argv[1]
    else:
        raw_input = sys.stdin.read()

    try:
        data = json.loads(raw_input)
        results = calculate_project_profitability(data)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
