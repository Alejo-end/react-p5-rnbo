import { Container, Flex, Heading } from '@chakra-ui/react'
import FuseSearch from 'components/FuseSearch'
import React, { FC } from 'react'
import { HomePageTypes } from 'types/Pages'

const HomePage: FC<HomePageTypes> = ({ data }) => {
  const { sketches } = data

  return (
    <Container maxW="container.lg">
      <Heading pb={4}>Welcome to my Alejandro?'s p5 Playground</Heading>
      <FuseSearch sketches={sketches} />
    </Container>
  )
}

export default HomePage
