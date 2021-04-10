import request from "request";
import k8s from "@kubernetes/client-node";
import express from "express";
import parsePrometheusTextFormat from "parse-prometheus-text-format";
import fs from "fs";

// k8s config
const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const coreV1Api = kc.makeApiClient(k8s.CoreV1Api);
const appsV1Api = kc.makeApiClient(k8s.AppsV1Api);
const app = express();

// middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// k8s metrcis api
// const url = `http://localhost:8001/api/v1/namespaces/kube-system/services/kube-state-metrics:http-metrics/proxy/metrics`;
const url = `http://localhost:8001/api/v1/nodes/docker-desktop/proxy/metrics/cadvisor`;
// const url = `http://localhost:8080/metrics`;

app.get("/", (req, res) => {
  res.send("hello");
});

// All pods
app.get("/allpods", async (req, res) => {
  try {
    const result = await coreV1Api.listNamespacedPod("default");
    const allPods = result.body.items.map((p) => p.metadata.name);
    res.json({ allPods: allPods });
  } catch (err) {
    console.log("something Worng : ", err);
  }
});

// all NameSpaces
app.get("/allnamespace", async (req, res) => {
  try {
    const result = await coreV1Api.listNamespace();
    const allNamespace = result.body.items.map((v) => v.metadata.name);
    res.json({ allNamespace: result });
  } catch (err) {
    console.log("something Worng : ", err);
  }
});

// All Deployment with Namespaces
app.get("/alldep/namespace", async (req, res) => {
  try {
    const result = await appsV1Api.listDeploymentForAllNamespaces();
    const allDepNamespace = result.body.items.map((v) => ({ depName: v.metadata.name, NameSpace: v.metadata.namespace }));
    res.json({ allDepNamespace: allDepNamespace });
  } catch (err) {
    console.log("something Worng : ", err);
  }
});

// All Service with Namespaces
app.get("/allservice", async (req, res) => {
  try {
    const result = await coreV1Api.listSecretForAllNamespaces();
    const allServicesNamespace = result.body.items.map((v) => ({ serviceName: v.metadata.name, NameSpace: v.metadata.namespace }));
    res.json({ allDepNamespace: allServicesNamespace });
  } catch (err) {
    console.log("something Worng : ", err);
  }
});

// Metrics
app.get("/cpuUsage", (req, res) => {
  request(url, { json: true }, (error, result, body) => {
    if (error) {
      return console.log(error);
    }
    if (!error && result.statusCode == 200) {
      fs.writeFileSync("./metrics.txt", body);
      const metricsStr = fs.readFileSync("./metrics.txt", "utf8");
      const parsed = parsePrometheusTextFormat(metricsStr);
      const contsPods = parsed.filter((v) => v.name === "container_cpu_system_seconds_total");
      const podsWithNamespace = contsPods[0].metrics.filter(
        (v) => v.labels.namespace === "default" && v.labels.container !== "POD" && v.labels.container !== ""
      );
      const cpuUsage = podsWithNamespace.map((p) => ({
        podName: p.labels.pod,
        cpuUsage: p.value,
      }));
      res.json({ containersPod: cpuUsage });
    }
  });
});
app.get("/memUsage", (req, res) => {
  request(url, { json: true }, (error, result, body) => {
    if (error) {
      return console.log(error);
    }
    if (!error && result.statusCode == 200) {
      fs.writeFileSync("./metrics.txt", body);
      const metricsStr = fs.readFileSync("./metrics.txt", "utf8");
      const parsed = parsePrometheusTextFormat(metricsStr);
      const contsPods = parsed.filter((v) => v.name === "container_memory_working_set_bytes");
      const podsWithNamespace = contsPods[0].metrics.filter(
        (v) => v.labels.namespace === "default" && v.labels.container !== "POD" && v.labels.image !== "" && v.labels.container !== ""
      );
      const memUse = podsWithNamespace.map((p) => ({
        podName: p.labels.pod,
        memUsage: p.value,
      }));
      res.json({ containersPod: memUse });
    }
  });
});
app.get("/met", (req, res) => {
  request(url, { json: true }, (error, result, body) => {
    if (error) {
      return console.log(error);
    }
    if (!error && result.statusCode == 200) {
      fs.writeFileSync("./metrics.txt", body);
      const metricsStr = fs.readFileSync("./metrics.txt", "utf8");
      const parsed = parsePrometheusTextFormat(metricsStr);
      res.json({ containersPod: parsed });
    }
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Sever is Started at PORT:${PORT} ===> http://localhost:${PORT} `);
});
