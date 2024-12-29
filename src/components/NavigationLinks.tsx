import { Flex, Icon, Text } from "@chakra-ui/react"
import { Home, Sparkles, StepBack } from "lucide-react"
import Link from "next/link"


export const NavigationLinks = () => {
    return (
        <Flex position="absolute" top={0} left={0} gap={3} p={2}>
            <Link href="/"><Icon as={StepBack} h={6} w={6} _hover={{color: "grey"}}/></Link>
            <Link href="https://alejandro-three.vercel.app/" target="_blank" rel="noopener noreferrer"><Text _hover={{color: "grey"}}>Back to Portfolio</Text></Link>
        </Flex>
    )
}