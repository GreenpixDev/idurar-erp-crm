{{/*
Expand the name of the chart.
*/}}
{{- define "idurar-erp-crm.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "backend.name" -}}
{{- default "backend" .Values.backend.nameOverride  | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "frontend.name" -}}
{{- default "frontend" .Values.frontend.nameOverride  | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "setup.name" -}}
{{- default "setup" .Values.setup.nameOverride  | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "idurar-erp-crm.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "backend.fullname" -}}
{{- if .Values.backend.fullnameOverride }}
{{- .Values.backend.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default "backend" .Values.backend.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "frontend.fullname" -}}
{{- if .Values.frontend.fullnameOverride }}
{{- .Values.frontend.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default "frontend" .Values.frontend.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "setup.fullname" -}}
{{- if .Values.setup.fullnameOverride }}
{{- .Values.setup.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default "setup" .Values.setup.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "idurar-erp-crm.mongodb.service.fullname" -}}
{{- if .Values.mongodb.service.nameOverride }}
{{- .Values.mongodb.service.nameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default "mongodb" .Values.frontend.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "idurar-erp-crm.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "idurar-erp-crm.labels" -}}
helm.sh/chart: {{ include "idurar-erp-crm.chart" . }}
{{ include "idurar-erp-crm.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "backend.labels" -}}
helm.sh/chart: {{ include "idurar-erp-crm.chart" . }}
{{ include "backend.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "frontend.labels" -}}
helm.sh/chart: {{ include "idurar-erp-crm.chart" . }}
{{ include "frontend.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "setup.labels" -}}
helm.sh/chart: {{ include "idurar-erp-crm.chart" . }}
{{ include "setup.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "idurar-erp-crm.selectorLabels" -}}
app.kubernetes.io/name: {{ include "idurar-erp-crm.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "backend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "backend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "frontend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "frontend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "setup.selectorLabels" -}}
app.kubernetes.io/name: {{ include "setup.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "idurar-erp-crm.mongodb.address" -}}
{{ include "idurar-erp-crm.mongodb.service.fullname" . }}:{{ .Values.mongodb.service.ports.mongodb }}
{{- end }}

{{- define "idurar-erp-crm.mongodb.url" -}}
mongodb://{{ .Values.backend.mongodb.username }}:{{ .Values.backend.mongodb.password }}@{{ include "idurar-erp-crm.mongodb.address" . }}/{{ .Values.backend.mongodb.database }}
{{- end }}

{{- define "idurar-erp-crm.mongodb.await" -}}
- sh
- -c
- |
  echo "Waiting for MongoDB..."

  TIMEOUT=60
  INTERVAL=2
  ELAPSED=0

  until nc -z {{ include "idurar-erp-crm.mongodb.service.fullname" . }} {{ .Values.mongodb.service.ports.mongodb }}; do
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))

    if [ $ELAPSED -ge $TIMEOUT ]; then
      echo "MongoDB is not reachable after ${TIMEOUT}s"
      exit 1
    fi

    echo "Still waiting... ${ELAPSED}s"
  done

  echo "MongoDB is reachable, running setup..."
  {{ .Values.setup.command }}
{{- end }}