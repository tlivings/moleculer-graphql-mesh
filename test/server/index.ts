
import { ServiceBroker } from 'moleculer';
import path from 'path';

const broker = new ServiceBroker({
  nodeID: 'testBroker',
  //transporter: 'nats://0.0.0.0:4222',
  logLevel: 'info',
  cacher: 'memory',
  hotReload: true
});

broker.loadService(path.join(__dirname, '../fixtures/services/service.a.ts'));
broker.loadService(path.join(__dirname, '../fixtures/services/service.b.ts'));
broker.loadService(path.join(__dirname, '../fixtures/services/service.c.ts'));

broker.start();

//.then(() => {
  // broker.waitForServices(['gqlA', 'gqlB', 'gqlC']).then(() => {
  //   setInterval(() => {
  //     broker.call('gqlC.$graphql', {
  //       input: `
  //         query {
  //           b {
  //             id
  //             value
  //             a {
  //               value
  //             }
  //           }
  //           a(id: 1) {
  //             id
  //             value,
  //             addedLater
  //           }
  //         }
  //       `,
  //       context: {}
  //     }).then((result) => {
  //       console.log(JSON.stringify(result, null, 2));
  //     });
  //   }, 10000);
  // });
// });