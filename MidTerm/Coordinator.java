
import java.util.Map; 
import java.util.HashMap;
import java.util.Random;

public class Coordinator {

	private Map<Long, NodeDescriptor> nodes;
	private Random rand;
	private long n, m, k, identifierRange;
	
	public static final int alpha = 3;

	public Coordinator(long n, long m, long k) {
		rand = new Random();
		this.n = n;
		this.m = m;
		this.k = k;
		identifierRange = (long) (Math.pow(2, m));
	}

	public void initialize() {
		nodes = new HashMap<>((int) n);
		long newId = (long) (rand.nextDouble() * identifierRange);
		NodeDescriptor first = new NodeDescriptor(newId, m, k);
		System.out.println("Generating first id: " + newId);
		nodes.put(first.getNodeId(), first);
	}
	
	public void generateNewNode() {
		// I generate a random id (different from the previous ones
		long newId = (long) (rand.nextDouble() * identifierRange);
		while (nodes.containsKey(newId))
			newId = (long) (rand.nextDouble() * identifierRange);
		System.out.println("Joining " + newId);
		
		// I find a random bootstrap node starting from the present ones
		long bootstrapId = (long) (rand.nextDouble() * nodes.size());
		NodeDescriptor bootstrap = nodes.values().stream().skip(bootstrapId).findFirst().get();
		System.out.println("bootstrap of " + newId + " is " + bootstrap.getNodeId());
		
		//
		NodeDescriptor newNode = new NodeDescriptor(newId, m, k);
		nodes.put(newId, newNode);
		newNode.joinNetwork(bootstrap);
		for(int i = 0; i < 1; i++) {
			long randomId = (long) (rand.nextDouble() * identifierRange);
			newNode.startFindNode(randomId, bootstrap);
		}	
	}
	
}
