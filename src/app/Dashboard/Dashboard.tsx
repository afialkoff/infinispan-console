import * as React from 'react';
import {PageSection, Title} from '@patternfly/react-core';
import {useEffect, useState} from "react";
import {async} from "q";

const Dashboard: React.FunctionComponent<any> = (props) => {
  // fetch('http://localhost:11222/rest/v2/cache-managers/DefaultCacheManager')
  //   .then(response => response.json())
  //   .then(data => console.log(data));

  // fetch('http://localhost:11222/rest/v2/server')
  //   .then(response => response.json())
  //   .then(data => console.log(data.version));
  // fetch('http://localhost:11222/rest/v2/server/config')
  //   .then(response => response.json())
  //   .then(data => console.log(data));
  // fetch('http://localhost:11222/rest/v2/server/memory')
  //   .then(response => response.json())
  //   .then(data => console.log(data));
  //
  // fetch('http://localhost:11222/rest/v2/server/env')
  //   .then(response => response.json())
  //   .then(data => console.log(data));
  //
  //   fetch('http://localhost:11222/rest/v2/server/cache-managers')
  //   .then(response => response.json())
  //   .then(data => console.log(data));
  //
  // fetch('http://localhost:11222/rest/v2/server/caches')
  //   .then(response => response.json())
  //   .then(data => console.log(data));
  //
  // fetch('http://localhost:11222/rest/v2/server/configurations')
  //   .then(response => response.json())
  //   .then(data => console.log(data));
  //
  // fetch('http://localhost:11222/rest/v2/server/cache-managers/DefaultCacheManager/health')
  //   .then(response => response)
  //   .then(data => console.log(data));

  return (
    <PageSection>
      <Title size="lg">Infinispan </Title>
      <ul>

      </ul>
    </PageSection>
  );
}

export { Dashboard };
